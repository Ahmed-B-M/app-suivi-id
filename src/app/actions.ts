
"use server";

import { z } from "zod";
import {
  schedulerSchema,
  serverExportSchema,
} from "@/lib/schemas";
import { optimizeApiCallSchedule } from "@/ai/flows/optimize-api-call-schedule";
import { Tache, Tournee } from "@/lib/types";
import { initializeFirebaseOnServer } from "@/firebase/server-init";
import { getDriverFullName } from "@/lib/grouping";
import { categorizeComment, CategorizeCommentOutput } from "@/ai/flows/categorize-comment";
import { format } from "date-fns";
import type { ProcessedNpsData } from "./nps-analysis/page";
import type { ProcessedVerbatim } from "./verbatim-treatment/page";


/**
 * Transforms a raw task object from the Urbantz API into the desired French structure.
 * @param rawTask - The raw task object from the API.
 * @returns A new, filtered and translated task object.
 */
function transformTaskData(rawTask: any): Tache {
  return {
    tacheId: rawTask.taskId || rawTask.id,
    type: rawTask.type,
    date: rawTask.date,
    progression: rawTask.progress,
    status: rawTask.status,
    client: rawTask.client,
    nomPlateforme: rawTask.platformName,
    dateCreation: rawTask.when,
    dateCloture: rawTask.closureDate,
    dateMiseAJour: rawTask.updated,
    tentatives: rawTask.attempts,
    completePar: rawTask.completedBy,
    
    hub: rawTask.hub,
    nomHub: rawTask.hubName,
    nomTournee: rawTask.roundName,
    sequence: rawTask.sequence,
    nomAssocie: rawTask.associatedName,
    livreur: rawTask.driver ? {
      prenom: rawTask.driver.firstName,
      nom: rawTask.driver.lastName,
      idExterne: rawTask.driver.externalId,
    } : undefined,

    creneauHoraire: rawTask.timeWindow ? {
      debut: rawTask.timeWindow.start,
      fin: rawTask.timeWindow.stop,
    } : undefined,
    heureReelle: rawTask.actualTime ? {
      arrivee: rawTask.actualTime.arrive ? {
        date: rawTask.actualTime.arrive.when,
        adresseCorrecte: rawTask.actualTime.arrive.isCorrectAddress,
      } : undefined,
    } : undefined,
    tempsDeServiceReel: rawTask.realServiceTime ? {
      debut: rawTask.realServiceTime.startTime,
      fin: rawTask.realServiceTime.endTime,
      duree: rawTask.realServiceTime.serviceTime,
    } : undefined,
    tempsDeServiceEstime: rawTask.serviceTime,

    contact: rawTask.contact ? {
      personne: rawTask.contact.person,
      telephone: rawTask.contact.phone,
      email: rawTask.contact.email,
      infoImmeuble: rawTask.contact.buildingInfo ? {
        etage: rawTask.contact.buildingInfo.floor,
        ascenseur: rawTask.contact.buildingInfo.hasElevator,
        digicode1: rawTask.contact.buildingInfo.digicode1,
        interphone: rawTask.contact.buildingInfo.hasInterphone,
        codeInterphone: rawTask.contact.buildingInfo.interphoneCode,
      } : undefined,
    } : undefined,
    localisation: rawTask.location ? {
      adresse: rawTask.location.address,
      rue: rawTask.location.street,
      numero: rawTask.location.number,
      codePostal: rawTask.location.zip,
      ville: rawTask.location.city,
      codePays: rawTask.location.countryCode,
      geometrie: rawTask.location.location?.geometry,
    } : undefined,
    instructions: rawTask.instructions,

    dimensions: rawTask.dimensions ? {
      volume: rawTask.dimensions.volume,
      bac: rawTask.dimensions.bac,
      poids: rawTask.dimensions.poids,
    } : undefined,
    articles: Array.isArray(rawTask.items) ? rawTask.items.map((item: any) => ({
      nom: item.name,
      statut: item.status,
      codeBarre: item.barcode,
      type: item.type,
      dimensions: item.dimensions ? {
        poids: item.dimensions.poids,
      } : undefined,
      log: Array.isArray(item.log) ? item.log.map((logEntry: any) => ({
        date: logEntry.when,
        vers: logEntry.to,
      })) : undefined,
    })) : undefined,

    execution: rawTask.execution ? {
        sansContact: rawTask.execution.contactless ? {
            forced: rawTask.execution.contactless.forced,
        } : undefined,
    } : undefined,
    metaDonnees: rawTask.metadata ? {
      notationLivreur: rawTask.metadata.notationLivreur,
      commentaireLivreur: rawTask.metadata.commentaireLivr,
      immeuble: rawTask.metadata.building,
    } : undefined,
  };
}

/**
 * Transforms a raw round object from the Urbantz API into the desired clean structure.
 * @param rawRound - The raw round object from the API.
 * @param hubIdToNameMap - A map to find hub names by their ID.
 * @returns A new, filtered and structured round object.
 */
function transformRoundData(rawRound: any, hubIdToNameMap: Map<string, string>): Tournee {
  const nomHub = rawRound.hub ? hubIdToNameMap.get(rawRound.hub) : undefined;
  return {
    id: rawRound.id || rawRound._id,
    date: rawRound.date,
    hub: rawRound.hub,
    nomHub: nomHub,
    dimensions: rawRound.dimensions,
    endLocation: rawRound.endLocation,
    endTime: rawRound.endTime,
    labelsAndSkills: rawRound.labelsAndSkills,
    metadata: rawRound.metadata ? {
      codePostalMaitre: rawRound.metadata.codePostalMaitre,
      TempsDepassementPlanifie: rawRound.metadata.TempsDepassementPlanifie,
      TempSURG_Chargement: rawRound.metadata.TempSURG_Chargement,
      TempsFRAIS_Chargement: rawRound.metadata.TempsFRAIS_Chargement,
      Immatriculation: rawRound.metadata.Immatriculation,
      TempsFRAIS_Fin: rawRound.metadata.TempsFRAIS_Fin,
      TempsSURG_Fin: rawRound.metadata.TempsSURG_Fin
    } : undefined,
    name: rawRound.name,
    orderCount: rawRound.orderCount,
    realInfo: rawRound.realInfo,
    reloads: rawRound.reloads,
    senders: Array.isArray(rawRound.senders) ? rawRound.senders.map((sender: any) => ({
      name: sender.name,
      count: sender.count,
    })) : [],
    startLocation: rawRound.startLocation,
    startTime: rawRound.startTime,
    status: rawRound.status,
    stops: Array.isArray(rawRound.stops) ? rawRound.stops.map((stop: any) => ({
      coordinates: stop.coordinates,
      taskId: stop.taskId,
      progress: stop.progress,
      status: stop.status,
      sequence: stop.sequence,
      stopSequence: stop.stopSequence,
      travelDistance: stop.travelDistance,
      arriveTime: stop.arriveTime,
      departTime: stop.departTime,
      travelTime: stop.travelTime,
      serviceTime: stop.serviceTime,
      waitTime: stop.waitTime,
      violationTime: stop.violationTime,
      closureDate: stop.closureDate,
    })) : [],
    totalDistance: rawRound.totalDistance,
    totalOrderServiceTime: rawRound.totalOrderServiceTime,
    totalTime: rawRound.totalTime,
    totalTravelTime: rawRound.totalTravelTime,
    totalViolationTime: rawRound.totalViolationTime,
    totalWaitTime: rawRound.totalWaitTime,
    updated: rawRound.updated,
    validated: rawRound.validated,
    driver: rawRound.driver ? {
      externalId: rawRound.driver.externalId,
      firstName: rawRound.driver.firstName,
      lastName: rawRound.driver.lastName,
    } : undefined,
    delay: rawRound.delay,
    orderDone: rawRound.orderDone,
    vehicle: rawRound.vehicle ? {
      name: rawRound.vehicle.name,
      dimensions: rawRound.vehicle.dimensions,
      accelerationTime: rawRound.vehicle.accelerationTime,
      maxOrders: rawRound.vehicle.maxOrders,
      maxDistance: rawRound.vehicle.maxDistance,
      maxDuration: rawRound.vehicle.maxDuration,
      fixedCost: rawRound.vehicle.fixedCost,
      costPerUnitTime: rawRound.vehicle.costPerUnitTime,
      costPerUnitDistance: rawRound.vehicle.costPerUnitDistance,
      type: rawRound.vehicle.type,
      reloading: rawRound.vehicle.reloading,
      breaks: rawRound.vehicle.breaks,
      labels: rawRound.vehicle.labels,
    } : undefined,
  };
}


/**
 * Generic function to query an Urbantz API endpoint (task or round).
 * Manages pagination to retrieve all data.
 * @param endpoint - The endpoint to call ('task' or 'round').
 * @param apiKey - The API key for authentication.
 * @param params - The query parameters (filters) to send to the API.
 * @param logs - An array to record log messages of the process.
 * @returns An array containing all items retrieved after pagination.
 */
async function fetchGeneric(
    endpoint: 'task' | 'round',
    apiKey: string,
    params: URLSearchParams,
    logs: string[]
) {
    const pageSize = 500;
    let page = 0;
    let hasMoreData = true;
    const allItems: any[] = [];
    const itemName = endpoint;

    while (hasMoreData) {
        const basePath = 'v2';
        const url = new URL(`https://api.urbantz.com/${basePath}/${endpoint}`);
        
        params.forEach((value, key) => url.searchParams.append(key, value));
        
        url.searchParams.append("page", page.toString());
        url.searchParams.append("pageSize", pageSize.toString());

        logs.push(
            `    - [${itemName.toUpperCase()}] Récupération de la page ${
                page + 1
            }...`
        );

        const response = await fetch(url.toString(), {
            headers: { "x-api-key": apiKey },
        });

        if (!response.ok) {
            const errorText = await response.text();
            logs.push(
                `    - ❌ [${itemName.toUpperCase()}] Erreur API: ${response.status} ${response.statusText}. ${errorText}`
            );
            throw new Error(`API error for ${itemName}: ${response.status} ${response.statusText}`);
        }

        const items = await response.json();
        logs.push(`    - [${itemName.toUpperCase()}] ${items.length} éléments bruts récupérés.`);

        if (items.length > 0) {
            allItems.push(...items);
            page++;
        } else {
            hasMoreData = false;
            if (page === 0) {
                logs.push(`    - Aucun ${itemName} trouvé pour ces paramètres.`);
            }
        }
    }
    return allItems;
}

// --- Task Fetching Logic ---
async function fetchTasks(
  apiKey: string,
  params: URLSearchParams,
  logs: string[]
) {
  const rawTasks = await fetchGeneric("task", apiKey, params, logs);
  logs.push(`\n🔄 Transformation de ${rawTasks.length} tâches brutes...`);
  const transformedTasks = rawTasks.map(transformTaskData);
  logs.push(`   - Transformation des tâches terminée.`);
  return transformedTasks;
}

// --- Round Fetching Logic ---
async function fetchRounds(
  apiKey: string,
  params: URLSearchParams,
  logs: string[],
  hubIdToNameMap: Map<string, string>
): Promise<Tournee[]> {
  const rawRounds = await fetchGeneric("round", apiKey, params, logs);
  logs.push(`\n🔄 Transformation de ${rawRounds.length} tournées brutes...`);
  const transformedRounds = rawRounds.map(round => transformRoundData(round, hubIdToNameMap));
  logs.push(`   - Transformation des tournées terminée.`);
  return transformedRounds;
}

// --- Unified Export Action ---
export async function runUnifiedExportAction(
  values: z.infer<typeof serverExportSchema>
) {
  const validatedFields = serverExportSchema.safeParse(values);
  if (!validatedFields.success) {
    return { logs: [], data: null, error: "Invalid input." };
  }
  
  const { apiKey, from, to, taskStatus, roundStatus, taskId, roundId, unplanned } =
    validatedFields.data;
  
  const logs: string[] = [];

  try {
    logs.push(`🚀 Début de l'exportation unifiée...`);
    logs.push(`   - Clé API: ********${apiKey.slice(-4)}`);

    logs.push(
      `   - Période sélectionnée: ${from}${from !== to ? ` à ${to}` : ''}`
    );

    // --- FETCH TASKS ---
    logs.push(`\n\n🛰️  Interrogation de l'API pour les TÂCHES...`);
    const taskParams = new URLSearchParams();
    if (taskStatus && taskStatus !== "all") taskParams.append("progress", taskStatus);
    if (taskId) taskParams.append("taskId", taskId);
    if (roundId) taskParams.append("round", roundId);
    if (unplanned) taskParams.append("unplanned", "true");
    
    logs.push(`   - Filtres Tâches: ${taskParams.toString() || "Aucun"}`);
    
    let allTasks: Tache[] = [];
    if (unplanned) {
        logs.push(`\n🗓️  Traitement des tâches non planifiées...`);
        const unplannedTasks = await fetchTasks(apiKey, taskParams, logs);
        allTasks.push(...unplannedTasks);
    } else {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        const dateCursor = fromDate;

        while (dateCursor <= toDate) {
            const dateString = format(dateCursor, 'yyyy-MM-dd');
            logs.push(`\n🗓️  Traitement des tâches pour le ${dateString}...`);
            const paramsForDay = new URLSearchParams(taskParams);
            paramsForDay.append("date", dateString);
            const tasksForDay = await fetchTasks(apiKey, paramsForDay, logs);
            allTasks.push(...tasksForDay);
            dateCursor.setDate(dateCursor.getDate() + 1);
        }
    }
    logs.push(`\n✅ ${allTasks.length} tâches épurées récupérées au total.`);
    
    // --- Create Hub ID to Name Map ---
    logs.push("\n🗺️  Création de la table de correspondance des hubs...");
    const hubIdToNameMap = new Map<string, string>();
    allTasks.forEach(task => {
      if (task.hub && task.nomHub && !hubIdToNameMap.has(task.hub)) {
        hubIdToNameMap.set(task.hub, task.nomHub);
      }
    });
    logs.push(`   - ${hubIdToNameMap.size} hubs uniques identifiés.`);


    // --- FETCH ROUNDS ---
    logs.push(`\n\n🛰️  Interrogation de l'API pour les TOURNÉES...`);
    const roundParams = new URLSearchParams();
    
    let allRounds: Tournee[] = [];
    const fromDateRounds = new Date(from);
    const toDateRounds = new Date(to);
    const dateCursorRounds = fromDateRounds;

     while (dateCursorRounds <= toDateRounds) {
      const dateString = format(dateCursorRounds, 'yyyy-MM-dd');
      logs.push(`\n🗓️  Traitement des tournées pour le ${dateString}...`);
      const paramsForDay = new URLSearchParams(roundParams);
      paramsForDay.append("date", dateString);
      const roundsForDay = await fetchRounds(apiKey, paramsForDay, logs, hubIdToNameMap);
      allRounds.push(...roundsForDay);
      dateCursorRounds.setDate(dateCursorRounds.getDate() + 1);
    }

    // Manual filtering for round status
    let filteredRounds = allRounds;
    if (roundStatus && roundStatus !== "all") {
      logs.push(`\n🔄 Filtrage manuel des tournées par statut: ${roundStatus}`);
      filteredRounds = allRounds.filter((round) => round.status === roundStatus);
      logs.push(
        `   - ${allRounds.length - filteredRounds.length} tournées écartées.`
      );
    }
     logs.push(`\n✅ ${filteredRounds.length} tournées épurées récupérées au total.`);

    logs.push(`\n\n🎉 Exportation terminée !`);
    logs.push(`   - ${allTasks.length} tâches et ${filteredRounds.length} tournées prêtes.`);
    logs.push(`✨ Les données sont affichées ci-dessous. Vous pouvez maintenant les télécharger ou les sauvegarder.`);

    return {
      logs,
      data: { tasks: allTasks, rounds: filteredRounds },
      error: null,
    };

  } catch (e) {
    const errorMsg = "❌ Une erreur inattendue est survenue durant l'exportation.";
    logs.push(errorMsg);
    if (e instanceof Error) {
      logs.push(e.message);
    }
    return {
      logs,
      data: null,
      error: errorMsg,
    };
  }
}


// --- AI Scheduler Action ---
export async function getScheduleAction(
  values: z.infer<typeof schedulerSchema>
) {
  const validatedFields = schedulerSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid input." };
  }

  try {
    const result = await optimizeApiCallSchedule(validatedFields.data);
    return { data: result };
  } catch (error) {
    console.error("AI schedule optimization failed:", error);
    return {
      error:
        "Failed to get schedule from AI. Please check your inputs and try again.",
    };
  }
}

// --- AI Comment Categorization (Single) ---
export async function categorizeSingleCommentAction(comment: string): Promise<CategorizeCommentOutput> {
  return await categorizeComment({ comment });
}

// --- Save Categorized Comments to Firestore ---
export async function saveCategorizedCommentsAction(
  categorizedComments: {
    taskId: string;
    comment: string;
    rating: number;
    category: string[];
    taskDate?: string;
    driverName?: string;
  }[]
) {
  try {
    const { firestore } = await initializeFirebaseOnServer();
    const batch = firestore.batch();
    
    categorizedComments.forEach(comment => {
      if (comment.taskId) {
        const docRef = firestore.collection("categorized_comments").doc(comment.taskId);
        // Ensure a default status is set when saving
        batch.set(docRef, { ...comment, status: 'à traiter' }, { merge: true });
      }
    });

    await batch.commit();
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error saving categorized comments:", error);
    return {
      success: false,
      error: error.message || "Failed to save categorized comments to Firestore.",
    };
  }
}

// --- Update a Single Categorized Comment in Firestore ---
export async function updateSingleCommentAction(
  comment: {
    taskId: string;
    comment: string;
    rating: number;
    category: string[];
    taskDate?: string;
    driverName?: string;
  }
) {
  try {
    const { firestore } = await initializeFirebaseOnServer();
    
    if (comment.taskId) {
      const docRef = firestore.collection("categorized_comments").doc(comment.taskId);
      const dataToSave = {
          ...comment,
          status: 'traité'
      };
      await docRef.set(dataToSave, { merge: true });
      return { success: true, error: null };
    } else {
      throw new Error("Task ID is missing.");
    }

  } catch (error: any) {
    console.error("Error updating single comment:", error);
    return {
      success: false,
      error: error.message || "Failed to update the comment in Firestore.",
    };
  }
}


// --- Save NPS data to Firestore ---
export async function saveNpsDataAction(
    payload: {
        associationDate: string; // Expecting 'yyyy-MM-dd' format
        verbatims: ProcessedNpsData[];
    }
) {
    try {
        const { firestore } = await initializeFirebaseOnServer();
        // The associationDate is already in 'yyyy-MM-dd' format, safe to use as ID.
        const docId = payload.associationDate;
        const docRef = firestore.collection("nps_data").doc(docId);
        
        await docRef.set(payload, { merge: true });

        return { success: true, error: null };

    } catch (error: any) {
        console.error("Error saving NPS data:", error);
        return {
            success: false,
            error: error.message || "Failed to save NPS data to Firestore.",
        };
    }
}


// --- Save a single Processed Verbatim to Firestore ---
export async function saveProcessedVerbatimAction(verbatim: ProcessedVerbatim) {
  try {
    const { firestore } = await initializeFirebaseOnServer();
    
    // Use taskId as the document ID to ensure uniqueness and easy lookups
    const docRef = firestore.collection("processed_nps_verbatims").doc(verbatim.taskId);
    
    const dataToSave: ProcessedVerbatim = {
      ...verbatim,
      status: 'traité' // Set status to 'traité' on save
    };
    
    await docRef.set(dataToSave, { merge: true });
    return { success: true, error: null };

  } catch (error: any) {
    console.error("Error saving processed verbatim:", error);
    return {
      success: false,
      error: error.message || "Failed to save processed verbatim to Firestore.",
    };
  }
}

    