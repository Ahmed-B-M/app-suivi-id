"use server";

import { z } from "zod";
import {
  exportFormSchema,
  roundExportFormSchema,
  schedulerSchema,
} from "@/lib/schemas";
import { optimizeApiCallSchedule } from "@/ai/flows/optimize-api-call-schedule";
import { Tache, Tournee } from "@/lib/types";

/**
 * Transforms a raw task object from the Urbantz API into the desired French structure.
 * @param rawTask - The raw task object from the API.
 * @returns A new, filtered and translated task object.
 */
function transformTaskData(rawTask: any): Tache {
  return {
    tacheId: rawTask.taskId,
    type: rawTask.type,
    date: rawTask.date,
    progression: rawTask.progress,
    client: rawTask.client,
    nomPlateforme: rawTask.platformName,
    dateCreation: rawTask.when,
    dateCloture: rawTask.closureDate,
    dateMiseAJour: rawTask.updated,
    tentatives: rawTask.attempts,
    completePar: rawTask.completedBy,
    
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
      sansContact: rawTask.execution.contactless,
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
 * @returns A new, filtered and structured round object.
 */
function transformRoundData(rawRound: any): Tournee {
  return {
    id: rawRound.id || rawRound._id,
    date: rawRound.date,
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
      TempSURG_Fin: rawRound.metadata.TempSURG_Fin,
      TempsFRAIS_Fin: rawRound.metadata.TempsFRAIS_Fin,
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
 * Fonction générique pour interroger un endpoint de l'API Urbantz (task ou round).
 * Gère la pagination pour récupérer toutes les données.
 * @param endpoint - Le nom de l'endpoint à appeler ('task' ou 'round').
 * @param apiKey - La clé API pour l'authentification.
 * @param params - Les paramètres de requête (filtres) à envoyer à l'API.
 * @param logs - Un tableau pour enregistrer les messages de log du processus.
 * @returns Un tableau contenant tous les éléments récupérés après pagination.
 */
async function fetchGeneric(
    endpoint: 'task' | 'round',
    apiKey: string,
    params: URLSearchParams,
    logs: string[]
) {
    // L'API Urbantz renvoie les données par pages. On définit une taille de page.
    const pageSize = 500;
    let page = 0;
    let hasMoreData = true;
    const allItems: any[] = [];
    const itemName = endpoint;

    // Boucle 'tant que' il y a des données à récupérer.
    while (hasMoreData) {
        const basePath = 'v2';
        const url = new URL(`https://api.urbantz.com/${basePath}/${endpoint}`);
        
        // Ajoute les paramètres de filtrage (reçus du formulaire) à l'URL.
        params.forEach((value, key) => url.searchParams.append(key, value));
        
        // Ajoute les paramètres de pagination à l'URL.
        url.searchParams.append("page", page.toString());
        url.searchParams.append("pageSize", pageSize.toString());

        logs.push(
            `    - Récupération de la page ${
                page + 1
            } avec les paramètres: ${params.toString()}`
        );

        // Exécute la requête 'fetch' vers l'API Urbantz.
        const response = await fetch(url.toString(), {
            headers: {
                // La clé API est passée dans l'en-tête pour l'authentification.
                "x-api-key": apiKey,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            logs.push(
                `    - ❌ Erreur API: ${response.status} ${response.statusText}. ${errorText}`
            );
            hasMoreData = false; // Arrête la boucle en cas d'erreur.
            continue;
        }

        // Convertit la réponse en JSON.
        const items = await response.json();
        logs.push(`    - ${items.length} ${itemName}s bruts récupérés.`);

        // Si la page contient des données, on les ajoute au tableau principal.
        if (items.length > 0) {
            allItems.push(...items);
            page++; // On passe à la page suivante pour la prochaine itération.
        } else {
            // Si la page est vide, c'est qu'il n'y a plus de données à récupérer.
            hasMoreData = false;
            if (page === 0) {
                logs.push(`    - Aucun ${itemName} trouvé pour ces paramètres.`);
            } else {
                logs.push(`    - Fin des données pour ces paramètres.`);
            }
        }
    }
    return allItems;
}


// --- Logique de récupération des Tâches ---
async function fetchTasks(
  apiKey: string,
  params: URLSearchParams,
  logs: string[]
) {
  // Appelle la fonction générique avec l'endpoint 'task'.
  const rawTasks = await fetchGeneric("task", apiKey, params, logs);
  logs.push(`\n🔄 Transformation de ${rawTasks.length} tâches brutes...`);
  // Applique la transformation pour ne garder que les champs spécifiés.
  const transformedTasks = rawTasks.map(transformTaskData);
  logs.push(`   - Transformation terminée.`);
  return transformedTasks;
}

// --- Action d'Exportation des Tâches ---
// C'est la fonction principale appelée par le formulaire des tâches.
export async function runExportAction(
  values: z.infer<typeof exportFormSchema>
) {
  // Valide les données du formulaire.
  const validatedFields = exportFormSchema.safeParse(values);
  if (!validatedFields.success) {
    return { logs: [], jsonData: null, error: "Invalid input." };
  }
  
  const { apiKey, from, to, status, taskId, roundId, unplanned } =
    validatedFields.data;
  const logs: string[] = [];

  try {
    logs.push(`🚀 Début de l'interrogation des tâches...`);
    logs.push(`   - Clé API: ********${apiKey.slice(-4)}`);

    // Crée un objet pour les paramètres de base.
    // Ces filtres sont supportés directement par l'API Urbantz.
    const baseParams = new URLSearchParams();
    if (status && status !== "all") baseParams.append("progress", status); // 'progress' est le nom du paramètre pour le statut dans l'API.
    if (taskId) baseParams.append("taskId", taskId);
    if (roundId) baseParams.append("round", roundId);
    if (unplanned) baseParams.append("unplanned", "true");

    logs.push(`   - Filtres API: ${baseParams.toString() || "Aucun"}`);

    const allTasks: any[] = [];
    logs.push(`\n🛰️  Interrogation de l'API Urbantz pour les tâches...`);
    
    // Cas spécial pour les tâches non planifiées, qui n'ont pas de date.
    if (unplanned) {
        logs.push(`\n🗓️  Traitement des tâches non planifiées...`);
        const unplannedTasks = await fetchTasks(apiKey, baseParams, logs);
        allTasks.push(...unplannedTasks);
    } else {
        // Pour les tâches planifiées, on doit boucler sur chaque jour de la période sélectionnée.
        const fromString = from.toISOString().split("T")[0];
        const toString = to.toISOString().split("T")[0];
        logs.push(
            `   - Période: ${fromString} à ${toString}`
        );
        const dateCursor = new Date(from);
        while (dateCursor <= to) {
            const dateString = dateCursor.toISOString().split("T")[0];
            logs.push(`\n🗓️  Traitement du ${dateString}...`);

            // Pour chaque jour, on crée une nouvelle requête avec le paramètre 'date'.
            const paramsForDay = new URLSearchParams(baseParams);
            paramsForDay.append("date", dateString);

            const tasksForDay = await fetchTasks(apiKey, paramsForDay, logs);
            allTasks.push(...tasksForDay);

            dateCursor.setDate(dateCursor.getDate() + 1);
        }
    }

    if (allTasks.length === 0) {
      logs.push(
        `\n⚠️ Aucune tâche récupérée pour les filtres sélectionnés.`
      );
      return {
        logs,
        jsonData: [],
        error: null,
      };
    }

    logs.push(`\n✅ ${allTasks.length} tâches épurées récupérées au total.`);
    logs.push(
      `\n🔄 Sauvegarde des données dans 'donnees_urbantz_tasks_filtrees.json'...`
    );
    logs.push(`\n🎉 Fichier prêt à être téléchargé!`);
    logs.push(`\n✨ Cliquez sur 'Sauvegarder dans Firestore' pour enregistrer les données.`);

    // Renvoie les logs et les données JSON au client.
    return {
      logs,
      jsonData: allTasks,
      error: null,
    };
  } catch (e) {
    const errorMsg = "❌ Une erreur inattendue est survenue.";
    logs.push(errorMsg);
    if (e instanceof Error) {
      logs.push(e.message);
    }
    return {
      logs,
      jsonData: null,
      error: errorMsg,
    };
  }
}

// --- Logique de récupération des Tournées ---
async function fetchRounds(
  apiKey: string,
  params: URLSearchParams,
  logs: string[]
): Promise<Tournee[]> {
  const rawRounds = await fetchGeneric("round", apiKey, params, logs);
  logs.push(`\n🔄 Transformation de ${rawRounds.length} tournées brutes...`);
  const transformedRounds = rawRounds.map(transformRoundData);
  logs.push(`   - Transformation terminée.`);
  return transformedRounds;
}

// --- Action d'Exportation des Tournées ---
export async function runRoundExportAction(
  values: z.infer<typeof roundExportFormSchema>
) {
  const validatedFields = roundExportFormSchema.safeParse(values);
  if (!validatedFields.success) {
    return { logs: [], jsonData: null, error: "Invalid input." };
  }

  const { apiKey, dateRange, status } = validatedFields.data;
  const { from, to } = dateRange;
  const logs: string[] = [];

  try {
    logs.push(`🚀 Début de l'interrogation des tournées...`);
    logs.push(`   - Clé API: ********${apiKey.slice(-4)}`);

    const baseParams = new URLSearchParams();

    const allRounds: any[] = [];
    logs.push(`\n🛰️  Interrogation de l'API Urbantz pour les tournées...`);

    const fromDate = from;
    const toDate = to || from; // If 'to' is not set, use 'from' as the end date.

    const fromString = fromDate.toISOString().split("T")[0];
    const toString = toDate.toISOString().split("T")[0];
    logs.push(
      `   - Période: ${fromString}${fromString !== toString ? ` à ${toString}` : ''}`
    );

    const dateCursor = new Date(fromDate);
    while (dateCursor <= toDate) {
      const dateString = dateCursor.toISOString().split("T")[0];
      logs.push(`\n🗓️  Traitement du ${dateString}...`);

      const paramsForDay = new URLSearchParams(baseParams);
      paramsForDay.append("date", dateString);

      const roundsForDay = await fetchRounds(apiKey, paramsForDay, logs);
      allRounds.push(...roundsForDay);

      dateCursor.setDate(dateCursor.getDate() + 1);
    }

    let filteredRounds = allRounds;
    if (status && status !== "all") {
      logs.push(`\n🔄 Filtrage des tournées par statut: ${status}`);
      filteredRounds = allRounds.filter((round) => round.status === status);
      logs.push(
        `   - ${allRounds.length - filteredRounds.length} tournées écartées.`
      );
    }

    if (filteredRounds.length === 0) {
      logs.push(
        `\n⚠️ Aucune donnée de tournée récupérée pour les filtres sélectionnés.`
      );
      return { logs, jsonData: [], error: null };
    }

    logs.push(`\n✅ ${filteredRounds.length} tournées récupérées au total.`);
    
    logs.push(
      `\n🔄 Sauvegarde des données dans 'donnees_urbantz_rounds_filtrees.json'...`
    );
    logs.push(`\n🎉 Fichier prêt à être téléchargé!`);
    logs.push(`\n✨ Cliquez sur 'Sauvegarder dans Firestore' pour enregistrer les données.`);

    return {
      logs,
      jsonData: filteredRounds,
      error: null,
    };
  } catch (e) {
    const errorMsg = "❌ Une erreur inattendue est survenue.";
    logs.push(errorMsg);
    if (e instanceof Error) {
      logs.push(e.message);
    }
    return { logs, jsonData: null, error: errorMsg };
  }
}

// --- Action du Planificateur IA ---
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
