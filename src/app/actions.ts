
"use server";

import { z } from "zod";
import {
  schedulerSchema,
  serverExportSchema,
} from "@/lib/schemas";
import { optimizeApiCallSchedule } from "@/ai/flows/optimize-api-call-schedule";
import { Tache, Tournee, Notification, NpsData, ProcessedNpsVerbatim as SavedProcessedNpsVerbatim } from "@/lib/types";
import { initializeFirebaseOnServer } from "@/firebase/server-init";
import { getDriverFullName } from "@/lib/grouping";
import { categorizeComment, CategorizeCommentOutput } from "@/ai/flows/categorize-comment";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import type { ProcessedNpsData } from "./nps-analysis/page";
import { ProcessedVerbatim } from "./verbatim-treatment/page";
import { FieldValue } from 'firebase-admin/firestore';
import equal from "deep-equal";
import { DateRange } from "react-day-picker";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function transformTaskData(rawTask: any, allRoundsData: any[]): Tache {
    const bacs = (rawTask.articles || []).reduce((acc: any, item: any) => {
        const type = (item.type || '').toUpperCase();
        if (type.includes('SURG')) acc.bacsSurg++;
        else if (type.includes('FRAIS')) acc.bacsFrais++;
        else if (type.includes('SEC')) acc.bacsSec++;
        else if (type.includes('POISSON')) acc.bacsPoisson++;
        else if (type.includes('BOUCHERIE')) acc.bacsBoucherie++;
        return acc;
    }, { bacsSurg: 0, bacsFrais: 0, bacsSec: 0, bacsPoisson: 0, bacsBoucherie: 0 });

    const roundInfo = allRoundsData.find(r => r.id === rawTask.round);
    const stopInfo = roundInfo?.stops?.find((s: any) => s.taskId === rawTask._id);
    
    const prenomChauffeur = rawTask.livreur?.prenom;
    const nomChauffeur = rawTask.livreur?.nom;
    const nomCompletChauffeur = [prenomChauffeur, nomChauffeur].filter(Boolean).join(' ');

    return {
        // Identification
        tacheId: rawTask.id,
        id: rawTask._id,
        referenceTache: rawTask.taskReference,
        numeroCommande: rawTask.id, // Task ID is used as order number
        client: rawTask.client,
        
        // Contenu de la Tâche
        bacsSurg: bacs.bacsSurg,
        bacsFrais: bacs.bacsFrais,
        bacsSec: bacs.bacsSec,
        bacsPoisson: bacs.bacsPoisson,
        bacsBoucherie: bacs.bacsBoucherie,
        totalSecFrais: bacs.bacsSec + bacs.bacsFrais,
        nombreDeBacs: rawTask.dimensions?.bac,
        poidsEnKg: rawTask.dimensions?.poids,
        volumeEnCm3: rawTask.dimensions?.volume,

        // Planification
        date: rawTask.date,
        dateInitialeLivraison: rawTask.metaDonnees?.Date_Initiale_Livraison,
        debutCreneauInitial: rawTask.creneauHoraire?.debut,
        finCreneauInitial: rawTask.creneauHoraire?.fin,
        heureArriveeEstimee: stopInfo?.arriveTime,
        tempsDeServiceEstime: rawTask.tempsDeServiceEstime,

        // Adresse & Instructions
        adresse: rawTask.localisation?.adresse,
        numero: rawTask.localisation?.numero,
        rue: rawTask.localisation?.rue,
        batiment: rawTask.metaDonnees?.immeuble,
        etage: rawTask.contact?.infoImmeuble?.etage,
        digicode1: rawTask.contact?.infoImmeuble?.digicode1,
        avecAscenseur: rawTask.contact?.infoImmeuble?.ascenseur,
        avecInterphone: rawTask.contact?.infoImmeuble?.interphone,
        codeInterphone: rawTask.contact?.infoImmeuble?.codeInterphone,
        ville: rawTask.localisation?.ville,
        codePostal: rawTask.localisation?.codePostal,
        pays: rawTask.localisation?.codePays,
        instructions: rawTask.instructions,
        
        // Contact Client
        personneContact: rawTask.contact?.personne,
        compteContact: rawTask.contact?.compte,
        emailContact: rawTask.contact?.email,
        telephoneContact: rawTask.contact?.telephone,
        notifEmail: rawTask.notificationSettings?.email,
        notifSms: rawTask.notificationSettings?.sms,

        // Réalisation & Statuts
        status: rawTask.status,
        heureArriveeReelle: rawTask.actualTime?.arrive?.when,
        dateCloture: rawTask.dateCloture,
        surPlaceForce: rawTask.actualTime?.arrive?.forced,
        surPlaceValide: rawTask.actualTime?.arrive?.isCorrectAddress,
        tempsDeRetard: roundInfo?.delay?.time,
        dateDuRetard: roundInfo?.delay?.when,
        tentatives: rawTask.tentatives,
        completePar: rawTask.completePar,
        
        // Temps de Service Réel
        tempsDeServiceReel: rawTask.realServiceTime?.serviceTime,
        debutTempsService: rawTask.realServiceTime?.startTime,
        finTempsService: rawTask.realServiceTime?.endTime,
        confianceTempsService: rawTask.realServiceTime?.confidence,
        versionTempsService: rawTask.realServiceTime?.version,
        horodatagesMinuteur: rawTask.execution?.timer?.timestamps,

        // Preuves & Échecs
        sansContactForce: rawTask.execution?.contactless?.forced,
        raisonSansContact: rawTask.execution?.contactless?.reason,
        raisonEchec: rawTask.execution?.failedReason?.reason,
        raisonEchecCusto: rawTask.execution?.failedReason?.custom,
        nomSignature: rawTask.execution?.signature?.name,
        photoSucces: rawTask.execution?.successPicture,
        latitudePosition: rawTask.execution?.position?.latitude,
        longitudePosition: rawTask.execution?.position?.longitude,

        // Infos Tournée & Chauffeur
        nomTournee: rawTask.nomTournee,
        sequence: rawTask.sequence,
        nomAssocie: rawTask.nomAssocie,
        idExterneChauffeur: rawTask.livreur?.idExterne,
        prenomChauffeur: prenomChauffeur,
        nomChauffeur: nomChauffeur,
        nomCompletChauffeur: nomCompletChauffeur,
        nomHub: rawTask.nomHub,
        nomPlateforme: rawTask.nomPlateforme,
        
        // Métadonnées & Système
        type: rawTask.type,
        flux: rawTask.flux,
        progression: rawTask.progression,
        tachesMemeArret: rawTask.realServiceTime?.tasksDeliveredInSameStop,
        categories: rawTask.categories,
        codePe: rawTask.metaDonnees?.codePe,
        notationLivreur: rawTask.metaDonnees?.notationLivreur,
        serviceMeta: rawTask.metaDonnees?.service,
        codeEntrepôt: rawTask.metaDonnees?.warehouseCode,
        commentaireLivreur: rawTask.metaDonnees?.commentaireLivreur,
        infosSuiviTransp: rawTask.externalCarrier?.trackingInfo,
        desassocTranspRejetee: rawTask.externalCarrier?.unassociationRejected,
        dateMiseAJour: rawTask.dateMiseAJour,
        dateCreation: rawTask.dateCreation,

        // Articles pour calculs
        articles: rawTask.articles,
        raw: rawTask,
    };
}

function transformRoundData(rawRound: any, allTasks: Tache[]): Tournee {
    const tasksForThisRound = allTasks.filter(t => 
        t.nomTournee === rawRound.name && 
        t.nomHub === rawRound.hubName &&
        new Date(t.date as string).toDateString() === new Date(rawRound.date).toDateString()
    );
    
    const bacs = tasksForThisRound.reduce((acc, task) => {
        acc.bacsSurg += task.bacsSurg;
        acc.bacsFrais += task.bacsFrais;
        acc.bacsSec += task.bacsSec;
        acc.bacsPoisson += task.bacsPoisson;
        acc.bacsBoucherie += task.bacsBoucherie;
        return acc;
    }, { bacsSurg: 0, bacsFrais: 0, bacsSec: 0, bacsPoisson: 0, bacsBoucherie: 0 });

    const poidsReelCalcule = tasksForThisRound.reduce((sum, task) => sum + (task.poidsEnKg || 0), 0);

    return {
        // Identification
        id: rawRound.id || rawRound._id,
        nom: rawRound.name,
        statut: rawRound.status,
        activite: rawRound.activity,
        date: rawRound.date,
        hubId: rawRound.hub,
        nomHub: rawRound.hubName,

        // Infos Chauffeur & Véhicule
        associeNom: rawRound.associatedName,
        emailChauffeur: rawRound.driver?.externalId,
        prenomChauffeur: rawRound.driver?.firstName,
        nomChauffeur: rawRound.driver?.lastName,
        immatriculation: rawRound.metadata?.Immatriculation,
        nomVehicule: rawRound.vehicle?.name,
        energie: rawRound.metadata?.Energie,

        // Totaux de la Tournée
        bacsSurg: bacs.bacsSurg,
        bacsFrais: bacs.bacsFrais,
        bacsSec: bacs.bacsSec,
        bacsPoisson: bacs.bacsPoisson,
        bacsBoucherie: bacs.bacsBoucherie,
        totalSecFrais: bacs.bacsSec + bacs.bacsFrais,
        nombreDeBacs: rawRound.dimensions?.bac,
        poidsTournee: rawRound.dimensions?.poids,
        poidsReel: poidsReelCalcule,
        volumeTournee: rawRound.dimensions?.volume,
        nbCommandes: rawRound.orderCount,
        commandesTerminees: rawRound.orderDone,
        
        // Horaires & Lieux
        lieuDepart: rawRound.startLocation,
        heureDepart: rawRound.startTime,
        lieuFin: rawRound.endLocation,
        heureFin: rawRound.endTime,
        heureFinReelle: rawRound.realInfo?.hasFinished,
        demarreeReel: rawRound.realInfo?.hasStarted,
        prepareeReel: rawRound.realInfo?.hasPrepared,
        tempsPreparationReel: rawRound.realInfo?.preparationTime,

        // Métriques & Coûts
        dureeReel: rawRound.realInfo?.hasLasted,
        tempsTotal: rawRound.totalTime,
        tempsTrajetTotal: rawRound.totalTravelTime,
        tempsServiceCmdTotal: rawRound.totalOrderServiceTime,
        tempsPauseTotal: rawRound.totalBreakServiceTime,
        tempsAttenteTotal: rawRound.totalWaitTime,
        tempsDeRetard: rawRound.delay?.time,
        dateDuRetard: rawRound.delay?.when,
        tempsViolationTotal: rawRound.totalViolationTime,
        distanceTotale: rawRound.totalDistance,
        coutTotal: rawRound.totalCost,
        coutParTemps: rawRound.vehicle?.costPerUnitTime,

        // Données Techniques & Véhicule
        flux: rawRound.flux,
        tempSurgChargement: rawRound.metadata?.TempSURG_Chargement,
        tempFraisChargement: rawRound.metadata?.TempsFRAIS_Chargement,
        tempFraisFin: rawRound.metadata?.TempsFRAIS_Fin,
        tempSurgFin: rawRound.metadata?.TempsSURG_Fin,
        codePostalMaitre: rawRound.metadata?.codePostalMaitre,
        arrets: rawRound.stops,
        tempsAccelerationVehicule: rawRound.vehicle?.accelerationTime,
        pausesVehicule: rawRound.vehicle?.breaks,
        capaciteBacs: rawRound.vehicle?.dimensions?.bac,
        capacitePoids: rawRound.vehicle?.dimensions?.poids,
        dimVehiculeVolume: rawRound.vehicle?.dimensions?.volume,
        distanceMaxVehicule: rawRound.vehicle?.maxDistance,
        dureeMaxVehicule: rawRound.vehicle?.maxDuration,
        commandesMaxVehicule: rawRound.vehicle?.maxOrders,
        misAJourLe: rawRound.updated,
        valide: rawRound.validated,
    };
}


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

async function fetchAllTasks(apiKey: string, params: URLSearchParams, logs: string[]): Promise<any[]> {
    return fetchGeneric("task", apiKey, params, logs);
}

async function fetchAllRounds(apiKey: string, params: URLSearchParams, logs: string[]): Promise<any[]> {
    return fetchGeneric("round", apiKey, params, logs);
}

export async function runSyncAction(
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
    logs.push(`   - Période: ${from} à ${to}`);

    const fromDate = new Date(from);
    const toDate = new Date(to);

    logs.push(`\n🛰️  Récupération des données brutes...`);
    const allRawRounds: any[] = [];
    const dateCursorRounds = new Date(fromDate);
    while (dateCursorRounds <= toDate) {
        const dateString = format(dateCursorRounds, 'yyyy-MM-dd');
        logs.push(`   - Tournées pour le ${dateString}...`);
        allRawRounds.push(...await fetchAllRounds(apiKey, new URLSearchParams({ date: dateString }), logs));
        dateCursorRounds.setDate(dateCursorRounds.getDate() + 1);
    }
    logs.push(`\n✅ ${allRawRounds.length} tournées brutes récupérées au total.`);

    const allRawTasks: any[] = [];
    if (unplanned) {
        logs.push(`   - Tâches non planifiées...`);
        allRawTasks.push(...await fetchAllTasks(apiKey, new URLSearchParams({ unplanned: "true" }), logs));
    } else {
        const dateCursorTasks = new Date(fromDate);
        while (dateCursorTasks <= toDate) {
            const dateString = format(dateCursorTasks, 'yyyy-MM-dd');
            logs.push(`   - Tâches pour le ${dateString}...`);
            const params = new URLSearchParams({ date: dateString });
            if (taskStatus && taskStatus !== 'all') params.append('progress', taskStatus);
            if (taskId) params.append('id', taskId);
            if (roundId) params.append('round', roundId);
            allRawTasks.push(...await fetchAllTasks(apiKey, params, logs));
            dateCursorTasks.setDate(dateCursorTasks.getDate() + 1);
        }
    }
    logs.push(`\n✅ ${allRawTasks.length} tâches brutes récupérées.`);

    logs.push(`\n\n🔄 Transformation et enrichissement des données...`);
    
    // On transforme les tâches d'abord, car la transformation des tournées en dépend pour les calculs
    const transformedTasks: Tache[] = allRawTasks.map(rawTask => transformTaskData(rawTask, allRawRounds));
    logs.push(`   - ${transformedTasks.length} tâches transformées.`);
    
    // Ensuite, on transforme les tournées, en leur passant les tâches déjà transformées
    const transformedRounds: Tournee[] = allRawRounds.map(rawRound => transformRoundData(rawRound, transformedTasks));
    logs.push(`   - ${transformedRounds.length} tournées transformées.`);

    // Filtrage final des tournées si un statut est spécifié
    let finalFilteredRounds = transformedRounds;
    if (roundStatus && roundStatus !== "all") {
      logs.push(`\n🔄 Filtrage des tournées par statut: ${roundStatus}`);
      finalFilteredRounds = transformedRounds.filter((round) => round.statut === roundStatus);
      logs.push(`   - ${transformedRounds.length - finalFilteredRounds.length} tournées écartées.`);
    }

    logs.push(`\n\n🎉 Exportation terminée !`);
    logs.push(`   - ${transformedTasks.length} tâches et ${finalFilteredRounds.length} tournées prêtes.`);

    return {
      logs,
      data: { tasks: transformedTasks, rounds: finalFilteredRounds },
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
    nomHub?: string;
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
    nomHub?: string;
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
    const { firestore } = await initializeFirebaseOnServer();
    const docId = payload.associationDate; // e.g., '2024-07-29'
    const docRef = firestore.collection("nps_data").doc(docId);

    try {
        // Fetch existing document for this date
        const existingDoc = await docRef.get();
        let finalVerbatims: ProcessedNpsData[] = [];

        if (existingDoc.exists) {
            const existingData = existingDoc.data() as NpsData;
            // Create a Map to handle deduplication based on taskId
            const verbatimsMap = new Map<string, ProcessedNpsData>();

            // Add existing verbatims to the map
            (existingData.verbatims || []).forEach(v => {
                verbatimsMap.set(v.taskId, v);
            });

            // Add new/updated verbatims, overwriting duplicates
            payload.verbatims.forEach(v => {
                verbatimsMap.set(v.taskId, v);
            });
            
            finalVerbatims = Array.from(verbatimsMap.values());
        } else {
            // No existing document, just use the new data
            finalVerbatims = payload.verbatims;
        }

        // Save the merged and deduplicated data
        await docRef.set({
            id: docId,
            associationDate: payload.associationDate,
            verbatims: finalVerbatims
        }, { merge: true });

        return { success: true, error: null, newCount: finalVerbatims.length };

    } catch (error: any) {
        console.error("Error saving/merging NPS data:", error);
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
    
    if (!verbatim.associationDate) {
        throw new Error("La date d'association est manquante pour le verbatim. Impossible de sauvegarder.");
    }
    
    const docRef = firestore.collection("processed_nps_verbatims").doc(verbatim.taskId);

    const dataToSave: Omit<ProcessedVerbatim, 'id'> & { status: 'traité' } = {
      ...verbatim,
      status: 'traité',
    };
    
    // Explicitly remove taskDate to avoid conflicts
    delete (dataToSave as any).taskDate;
    
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

// --- Save Action Note to Firestore ---
export async function saveActionNoteAction(note: { depot: string, content: string; date: string }) {
  try {
    const { firestore } = await initializeFirebaseOnServer();
    const docId = `${note.depot}-${note.date}`; // Use depot-YYYY-MM-DD as the document ID
    const docRef = firestore.collection("action_notes_depot").doc(docId);
    
    // Using set with merge to create or update the document for that day and depot
    await docRef.set({
      depot: note.depot,
      date: note.date,
      content: note.content
    }, { merge: true });

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error saving action note:", error);
    return {
      success: false,
      error: error.message || "Failed to save action note to Firestore.",
    };
  }
}

async function createNotification(firestore: FirebaseFirestore.Firestore, notification: Omit<Notification, 'id' | 'createdAt' | 'status'>) {
    const notificationWithTimestamp = {
        ...notification,
        status: 'unread' as const,
        createdAt: FieldValue.serverTimestamp(),
    };
    await firestore.collection('notifications').add(notificationWithTimestamp);
}

// Helper to normalize date formats in objects for comparison
function normalizeDatesInObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date || (obj && typeof obj.toDate === 'function')) {
      const date = obj.toDate ? obj.toDate() : obj;
      return date.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(normalizeDatesInObject);
  }
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = normalizeDatesInObject(obj[key]);
    }
  }
  return newObj;
}

async function saveCollectionInAction(
    collectionRef: FirebaseFirestore.CollectionReference,
    dataFromApi: any[], 
    idKey: string, 
    dateRange: DateRange,
    logs: string[]
) {
    const collectionName = collectionRef.id;
    logs.push(`\n   -> Synchronisation de la collection "${collectionName}"...`);
    
    if (!dateRange.from) {
        logs.push(`      - ⚠️ Aucune date de début sélectionnée. Abandon.`);
        return false;
    }
    const fromDate = startOfDay(dateRange.from);
    const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    logs.push(`      - Recherche des documents existants entre ${format(fromDate, 'dd/MM/yy')} et ${format(toDate, 'dd/MM/yy')}...`);
    
    const existingDocsMap = new Map<string, any>();
    try {
        const q = collectionRef.where("date", ">=", fromDate).where("date", "<=", toDate);
        const snapshot = await q.get();
        snapshot.forEach(doc => {
            const data = doc.data();
            const id = String(data[idKey] || doc.id).replace(/^0+/, '');
            if (id) {
                existingDocsMap.set(id, { ...data, __docId: doc.id });
            }
        });
        logs.push(`      - ${existingDocsMap.size} documents trouvés dans la base de données.`);
    } catch (e: any) {
        logs.push(`      - ❌ Erreur lors de la lecture des documents existants: ${e.message}`);
        return false;
    }

    const apiIds = new Set(dataFromApi.map(item => String(item[idKey]).replace(/^0+/, '')));
    const firestoreIds = new Set(Array.from(existingDocsMap.keys()));

    const idsToDelete = [...firestoreIds].filter(id => !apiIds.has(id));
    if (idsToDelete.length > 0) {
        logs.push(`      - 🗑️ ${idsToDelete.length} documents à supprimer.`);
        const deleteBatchSize = 400;
        for (let i = 0; i < idsToDelete.length; i += deleteBatchSize) {
            const batch = collectionRef.firestore.batch();
            const chunk = idsToDelete.slice(i, i + deleteBatchSize);
            chunk.forEach(idToDelete => {
                const docToDelete = existingDocsMap.get(idToDelete);
                if (docToDelete && docToDelete.__docId) {
                    batch.delete(collectionRef.doc(docToDelete.__docId));
                }
            });
            await batch.commit();
            logs.push(`      - Lot de suppression ${i / deleteBatchSize + 1}/${Math.ceil(idsToDelete.length / deleteBatchSize)} terminé.`);
            if (idsToDelete.length > deleteBatchSize) await delay(1500);
        }
    } else {
        logs.push(`      - ✅ Aucune suppression nécessaire.`);
    }

    const itemsToUpdate: any[] = [];
    let unchangedCount = 0;
    
    dataFromApi.forEach(item => {
        const id = String(item[idKey]).replace(/^0+/, '');
        if (!id) return;

        const existingDoc = existingDocsMap.get(id);
        if (!existingDoc) {
            itemsToUpdate.push(item);
        } else {
            const { __docId, ...comparableExisting } = existingDoc;
            const normalizedExisting = normalizeDatesInObject(comparableExisting);
            const normalizedApi = normalizeDatesInObject({ ...item });

            if (!equal(normalizedExisting, normalizedApi)) {
                itemsToUpdate.push(item);
            } else {
                unchangedCount++;
            }
        }
    });

    logs.push(`      - Documents à écrire (nouveaux ou modifiés): ${itemsToUpdate.length}`);
    logs.push(`      - Documents inchangés (ignorés): ${unchangedCount}`);

    if (itemsToUpdate.length > 0) {
        const writeBatchSize = 400;
        for (let i = 0; i < itemsToUpdate.length; i += writeBatchSize) {
            const currentBatchNumber = Math.floor(i / writeBatchSize) + 1;
            const batch = collectionRef.firestore.batch();
            const chunk = itemsToUpdate.slice(i, i + writeBatchSize);

            chunk.forEach(item => {
                const docId = String(item[idKey]);
                if (docId) {
                    const docRef = collectionRef.doc(docId);
                    const dataToSet: { [key: string]: any } = {};
                    Object.keys(item).forEach(key => {
                        const value = item[key];
                        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
                            try { dataToSet[key] = new Date(value); } catch (e) { dataToSet[key] = value; }
                        } else {
                            dataToSet[key] = value;
                        }
                    });
                    batch.set(docRef, dataToSet);
                }
            });

            logs.push(`      - Écriture du lot ${currentBatchNumber}/${Math.ceil(itemsToUpdate.length / writeBatchSize)}...`);
            await batch.commit();
            logs.push(`      - ✅ Lot ${currentBatchNumber} sauvegardé.`);

            if (itemsToUpdate.length > writeBatchSize) {
                await delay(1500);
            }
        }
    } else {
        logs.push(`      - ✅ Aucune écriture nécessaire.`);
    }
    return true;
}


// --- Daily Sync Action ---
export async function runDailySyncAction() {
  const apiKey = process.env.URBANTZ_API_KEY || "P_q6uTM746JQlmFpewz3ZS0cDV0tT8UEXk";
  if (!apiKey) {
    return { success: false, error: "Clé API Urbantz non configurée sur le serveur." };
  }
  
  const to = new Date();
  const from = subDays(to, 1);
  const fromString = format(from, 'yyyy-MM-dd');
  const toString = format(to, 'yyyy-MM-dd');
  
  const logs: string[] = [];

  try {
    const { firestore } = await initializeFirebaseOnServer();
    logs.push(`🚀 Début de la synchronisation 48h... (${fromString} - ${toString})`);

    const taskParams = new URLSearchParams();
    let allRawTasks: any[] = [];
    const dateCursorTasks = startOfDay(from);
    while (dateCursorTasks <= to) {
        const dateString = format(dateCursorTasks, 'yyyy-MM-dd');
        logs.push(`\n🗓️  Traitement des tâches pour le ${dateString}...`);
        const paramsForDay = new URLSearchParams(taskParams);
        paramsForDay.append("date", dateString);
        const tasksForDay = await fetchAllTasks(apiKey, paramsForDay, logs);
        allRawTasks.push(...tasksForDay);
        dateCursorTasks.setDate(dateCursorTasks.getDate() + 1);
    }
    logs.push(`\n✅ ${allRawTasks.length} tâches brutes récupérées au total.`);
    
    const roundParams = new URLSearchParams();
    let allRawRounds: any[] = [];
    const dateCursorRounds = startOfDay(from);
     while (dateCursorRounds <= to) {
      const dateString = format(dateCursorRounds, 'yyyy-MM-dd');
      logs.push(`\n🗓️  Traitement des tournées pour le ${dateString}...`);
      const paramsForDay = new URLSearchParams(roundParams);
      paramsForDay.append("date", dateString);
      const roundsForDay = await fetchAllRounds(apiKey, paramsForDay, logs);
      allRawRounds.push(...roundsForDay);
      dateCursorRounds.setDate(dateCursorRounds.getDate() + 1);
    }
    logs.push(`\n✅ ${allRawRounds.length} tournées brutes récupérées au total.`);

    logs.push(`\n\n🔄 Transformation et enrichissement des données...`);
    
    const transformedTasks: Tache[] = allRawTasks.map(rawTask => transformTaskData(rawTask, allRawRounds));
    logs.push(`   - ${transformedTasks.length} tâches transformées.`);
    
    const transformedRounds: Tournee[] = allRawRounds.map(rawRound => transformRoundData(rawRound, transformedTasks));
    logs.push(`   - ${transformedRounds.length} tournées transformées.`);


    // --- SAVE TO FIRESTORE ---
    logs.push(`\n💾 Début de la sauvegarde intelligente dans Firestore...`);
    
    const tasksCollectionRef = firestore.collection('tasks');
    const roundsCollectionRef = firestore.collection('rounds');

    await saveCollectionInAction(tasksCollectionRef, transformedTasks, 'tacheId', { from, to }, logs);
    await saveCollectionInAction(roundsCollectionRef, transformedRounds, 'id', { from, to }, logs);
    
    // --- Generate Notifications ---
    logs.push(`\n🔔 Génération des notifications...`);
    let notificationCount = 0;
    // 1. Quality Alerts
    const qualityAlertTasks = transformedTasks.filter(t => typeof t.notationLivreur === 'number' && t.notationLivreur < 4);
    for (const task of qualityAlertTasks) {
        await createNotification(firestore, {
            type: 'quality_alert',
            message: `Alerte qualité pour ${getDriverFullName(task) || 'un livreur'}. Note de ${task.notationLivreur}/5 sur la tournée ${task.nomTournee || 'inconnue'}.`,
            relatedEntity: { type: 'task', id: task.tacheId }
        });
        notificationCount++;
    }
    // 2. Overweight Rounds (assuming this logic is available or can be added)
    const overweightRounds = transformedRounds.filter(r => r.poidsReel && r.poidsReel > 1250);
    for (const round of overweightRounds) {
       await createNotification(firestore, {
            type: 'overweight_round',
            message: `La tournée ${round.nom} est en surcharge de poids (${round.poidsReel?.toFixed(0)} kg).`,
            relatedEntity: { type: 'round', id: round.id }
        });
        notificationCount++;
    }
    logs.push(`   - ✅ ${notificationCount} notifications générées.`);

    logs.push(`\n🎉 Synchronisation 48h terminée !`);
    return { success: true, error: null, logs };

  } catch (e) {
    const errorMsg = "❌ Une erreur inattendue est survenue durant la synchronisation.";
    logs.push(errorMsg);
    if (e instanceof Error) {
      logs.push(e.message);
    }
    return {
      success: false,
      error: errorMsg,
      logs
    };
  }
}
