
"use server";

import { z } from "zod";
import {
  schedulerSchema,
  serverExportSchema,
} from "@/lib/schemas";
import { optimizeApiCallSchedule } from "@/ai/flows/optimize-api-call-schedule";
import { Tache, Tournee, Notification, NpsData, ProcessedNpsVerbatim as SavedProcessedNpsVerbatim, Article } from "@/lib/types";
import { initializeFirebaseOnServer } from "@/firebase/server-init";
import { getDriverFullName } from "@/lib/grouping";
import { categorizeComment, CategorizeCommentOutput } from "@/ai/flows/categorize-comment";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import type { ProcessedNpsData } from "../nps-analysis/page";
import { ProcessedVerbatim } from "../verbatim-treatment/page";
import { FieldValue } from 'firebase-admin/firestore';
import equal from "deep-equal";
import { DateRange } from "react-day-picker";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const toIsoOrUndefined = (date: any): string | undefined => {
    if (!date) return undefined;
    try {
        const d = new Date(date);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
    } catch {
        return undefined;
    }
};

function transformTaskData(rawTask: any, allRoundsData: Tournee[]): Tache {
    // Prioritize finding the round by its unique ID if available
    let roundInfo = rawTask.round ? allRoundsData.find(r => r.id === rawTask.round) : undefined;
    
    // Fallback to the previous method if no match by ID
    if (!roundInfo) {
      roundInfo = allRoundsData.find(r => 
        r.nom === rawTask.roundName && 
        r.nomHub === rawTask.hubName &&
        r.date && rawTask.date &&
        new Date(r.date as string).toDateString() === new Date(rawTask.date).toDateString()
      );
    }

    const stopInfo = roundInfo?.arrets?.find((s: any) => s.taskId === rawTask._id);
    
    const bacs = (rawTask.items || []).reduce((acc: any, item: any) => {
        const type = (item.type || '').toUpperCase();
        if (type === 'SURG') acc.bacsSurg++;
        else if (type === 'FRAIS') acc.bacsFrais++;
        else if (type === 'SEC') acc.bacsSec++;
        else if (type === 'POISSON') acc.bacsPoisson++;
        else if (type === 'BOUCHERIE') acc.bacsBoucherie++;
        return acc;
    }, { bacsSurg: 0, bacsFrais: 0, bacsSec: 0, bacsPoisson: 0, bacsBoucherie: 0 });

    return {
        // Identification
        tacheId: rawTask.taskId,
        idInterne: rawTask.taskReference,
        referenceTache: rawTask.taskReference,
        id: rawTask._id,
        commande: rawTask.metadata?.numeroCommande,
        client: rawTask.client,
        
        // Contenu
        bacsSurg: bacs.bacsSurg,
        bacsFrais: bacs.bacsFrais,
        bacsSec: bacs.bacsSec,
        bacsPoisson: bacs.bacsPoisson,
        bacsBoucherie: bacs.bacsBoucherie,
        totalSecFrais: bacs.bacsSec + bacs.bacsFrais,
        nombreDeBacs: rawTask.dimensions?.bac,
        nombreDeBacsMeta: rawTask.metadata?.nbreBacs,
        poidsEnKg: rawTask.dimensions?.poids,
        volumeEnCm3: rawTask.dimensions?.volume,

        // Planification
        date: toIsoOrUndefined(rawTask.date),
        dateInitialeLivraison: rawTask.metadata?.Date_Initiale_Livraison,
        debutCreneauInitial: toIsoOrUndefined(rawTask.timeWindow?.start),
        finCreneauInitial: toIsoOrUndefined(rawTask.timeWindow?.stop),
        debutFenetre: toIsoOrUndefined(rawTask.timeWindow?.start),
        finFenetre: toIsoOrUndefined(rawTask.timeWindow?.stop),
        margeFenetreHoraire: rawTask.timeWindowMargin,
        heureArriveeEstimee: toIsoOrUndefined(stopInfo?.arriveTime),
        tempsDeServiceEstime: rawTask.serviceTime,

        // Adresse & Instructions
        adresse: rawTask.location?.address,
        numero: rawTask.location?.number,
        rue: rawTask.location?.street,
        batiment: rawTask.location?.building,
        batimentMeta: rawTask.metadata?.building,
        etage: rawTask.contact?.buildingInfo?.floor,
        digicode1: rawTask.contact?.buildingInfo?.digicode1,
        avecAscenseur: rawTask.contact?.buildingInfo?.hasElevator,
        avecInterphone: rawTask.contact?.buildingInfo?.hasInterphone,
        codeInterphone: rawTask.contact?.buildingInfo?.interphoneCode,
        ville: rawTask.location?.city,
        codePostal: rawTask.location?.zip,
        pays: rawTask.location?.countryCode,
        instructions: rawTask.instructions,

        // Contact Client
        personneContact: rawTask.contact?.person,
        compteContact: rawTask.contact?.account,
        emailContact: rawTask.contact?.email,
        telephoneContact: rawTask.contact?.phone,
        notifEmail: rawTask.notificationSettings?.email,
        notifSms: rawTask.notificationSettings?.sms,

        // Réalisation & Statuts
        status: rawTask.status,
        heureArriveeReelle: toIsoOrUndefined(rawTask.actualTime?.arrive.when),
        dateCloture: toIsoOrUndefined(rawTask.closureDate),
        surPlaceForce: rawTask.actualTime?.arrive.forced,
        surPlaceValide: rawTask.actualTime?.arrive.isCorrectAddress,
        tempsDeRetard: roundInfo?.tempsDeRetard,
        dateDuRetard: toIsoOrUndefined(roundInfo?.dateDuRetard),
        tentatives: rawTask.attempts,
        terminePar: rawTask.completedBy,

        // Temps de Service Réel
        tempsDeServiceReel: rawTask.realServiceTime?.serviceTime,
        debutTempsService: toIsoOrUndefined(rawTask.realServiceTime?.startTime),
        finTempsService: toIsoOrUndefined(rawTask.realServiceTime?.endTime),
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
        nomTournee: rawTask.roundName,
        sequence: rawTask.sequence,
        nomAssocie: rawTask.associatedName, // c'est nous
        idExterneChauffeur: rawTask.driver?.externalId,
        prenomChauffeur: rawTask.driver?.firstName,
        nomChauffeur: rawTask.driver?.lastName,
        hubId: rawTask.hub,
        nomHub: rawTask.hubName,
        nomPlateforme: rawTask.platformName,
        nomCompletChauffeur: getDriverFullName(rawTask),
        
        // Métadonnées & Système
        type: rawTask.type,
        flux: rawTask.flux,
        progression: rawTask.progress,
        tachesMemeArret: rawTask.realServiceTime?.tasksDeliveredInSameStop,
        categories: rawTask.categories,
        codePe: rawTask.metadata?.codePe,
        notationLivreur: rawTask.metadata?.notationLivreur,
        serviceMeta: rawTask.metadata?.service,
        codeEntrepôt: rawTask.metadata?.warehouseCode,
        metaCommentaireLivreur: rawTask.metadata?.commentaireLivr,
        infosSuiviTransp: rawTask.externalCarrier?.trackingInfo,
        desassocTranspRejetee: rawTask.externalCarrier?.unassociationRejected,
        dateMiseAJour: toIsoOrUndefined(rawTask.updated),
        dateCreation: toIsoOrUndefined(rawTask.when),
        
        // Données brutes des articles
        articles: (rawTask.items || []).map((item: any): Article => ({
            tacheId: rawTask.taskId,
            codeBarre: item.barcode,
            tourneeId: rawTask.round,
            nomTournee: rawTask.roundName,
            nom: item.name,
            type: item.type,
            statut: item.status,
            quantite: item.quantity,
            quantiteTraitee: item.processedQuantity,
            dimensions: item.dimensions,
            encodageCodeBarres: item.barcodeEncoding,
            endommage: item.damaged,
            log: item.log,
            reference: item.reference,
            etiquettes: item.labels,
            competences: item.skills,
            metaDonnees: item.metadata,
            description: item.description,
            groupe: item.group,
        })),
        livreur: rawTask.driver, // Garder l'objet livreur
    };
}

function transformRoundData(rawRound: any, allTasks: Tache[]): Tournee {
    const roundDateStr = new Date(rawRound.date).toDateString();
    
    // Use a robust key for matching
    const tasksForThisRound = allTasks.filter(t => 
        t.hubId === rawRound.hub &&
        t.nomTournee === rawRound.name &&
        t.date && new Date(t.date as string).toDateString() === roundDateStr
    );

    const aggregatedBacs = tasksForThisRound.reduce((acc, task) => {
        acc.bacsSurg += task.bacsSurg;
        acc.bacsFrais += task.bacsFrais;
        acc.bacsSec += task.bacsSec;
        acc.bacsPoisson += task.bacsPoisson;
        acc.bacsBoucherie += task.bacsBoucherie;
        return acc;
    }, { bacsSurg: 0, bacsFrais: 0, bacsSec: 0, bacsPoisson: 0, bacsBoucherie: 0 });

    const poidsReel = tasksForThisRound.reduce((sum, task) => sum + (task.poidsEnKg || 0), 0);
    const nomHub = tasksForThisRound.length > 0 ? tasksForThisRound[0].nomHub : rawRound.hubName;

    return {
        // Identification
        idInterne: rawRound.id || rawRound._id,
        id: rawRound.id || rawRound._id,
        nom: rawRound.name,
        statut: rawRound.status,
        activite: rawRound.activity,
        date: toIsoOrUndefined(rawRound.date),
        hubId: rawRound.hub,
        nomHub: nomHub || rawRound.hubName,

        // Chauffeur & Véhicule
        associeNom: rawRound.associatedName,
        emailChauffeur: rawRound.driver?.externalId,
        prenomChauffeur: rawRound.driver?.firstName,
        nomChauffeur: rawRound.driver?.lastName,
        immatriculation: rawRound.metadata?.Immatriculation,
        nomVehicule: rawRound.vehicle?.name,
        energie: rawRound.metadata?.Energie,

        // Totaux
        bacsSurg: aggregatedBacs.bacsSurg,
        bacsFrais: aggregatedBacs.bacsFrais,
        bacsSec: aggregatedBacs.bacsSec,
        bacsPoisson: aggregatedBacs.bacsPoisson,
        bacsBoucherie: aggregatedBacs.bacsBoucherie,
        totalSecFrais: aggregatedBacs.bacsSec + aggregatedBacs.bacsFrais,
        nombreDeBacs: rawRound.dimensions?.bac,
        poidsTournee: rawRound.dimensions?.poids,
        poidsReel: poidsReel,
        volumeTournee: rawRound.dimensions?.volume,
        nbCommandes: rawRound.orderCount,
        commandesTerminees: rawRound.orderDone,
        
        // Horaires & Lieux
        lieuDepart: rawRound.startLocation,
        heureDepart: toIsoOrUndefined(rawRound.startTime),
        lieuFin: rawRound.endLocation,
        heureFin: toIsoOrUndefined(rawRound.endTime),
        heureFinReelle: toIsoOrUndefined(rawRound.realInfo?.hasFinished),
        demarreeReel: toIsoOrUndefined(rawRound.realInfo?.hasStarted),
        prepareeReel: toIsoOrUndefined(rawRound.realInfo?.hasPrepared),
        tempsPreparationReel: rawRound.realInfo?.preparationTime,

        // Métriques & Coûts
        dureeReel: rawRound.realInfo?.hasLasted,
        tempsTotal: rawRound.totalTime,
        tempsTrajetTotal: rawRound.totalTravelTime,
        tempsServiceCmdTotal: rawRound.totalOrderServiceTime,
        tempsPauseTotal: rawRound.totalBreakServiceTime,
        tempsAttenteTotal: rawRound.totalWaitTime,
        tempsDeRetard: rawRound.delay?.time,
        dateDuRetard: toIsoOrUndefined(rawRound.delay?.when),
        tempsViolationTotal: rawRound.totalViolationTime,
        distanceTotale: rawRound.totalDistance,
        coutTotal: rawRound.totalCost,
        coutParTemps: rawRound.vehicle?.costPerUnitTime,

        // Données Techniques
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
        misAJourLe: toIsoOrUndefined(rawRound.updated),
        valide: rawRound.validated,
        driver: rawRound.driver,
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
            if (taskId) params.append('taskId', taskId);
            if (roundId) params.append('round', roundId);
            allRawTasks.push(...await fetchAllTasks(apiKey, params, logs));
            dateCursorTasks.setDate(dateCursorTasks.getDate() + 1);
        }
    }
    logs.push(`\n✅ ${allRawRounds.length} tournées et ${allRawTasks.length} tâches brutes récupérées.`);

    logs.push(`\n\n🔄 Transformation et enrichissement des données...`);
    
    // An initial transformation of rounds is needed to correctly link tasks later.
    const initialTransformedRounds: Tournee[] = allRawRounds.map(rawRound => transformRoundData(rawRound, []));
    logs.push(`   - ${initialTransformedRounds.length} tournées initialement transformées.`);

    const transformedTasks: Tache[] = allRawTasks.map(rawTask => transformTaskData(rawTask, initialTransformedRounds));
    logs.push(`   - ${transformedTasks.length} tâches transformées.`);
    
    // Now, re-transform rounds to include calculations based on the fully transformed tasks.
    const finalTransformedRounds: Tournee[] = allRawRounds.map(rawRound => transformRoundData(rawRound, transformedTasks));
    logs.push(`   - ${finalTransformedRounds.length} tournées finalisées avec calculs de bacs/poids.`);
    
    let finalFilteredRounds = finalTransformedRounds;
    if (roundStatus && roundStatus !== "all") {
      logs.push(`\n🔄 Filtrage des tournées par statut: ${roundStatus}`);
      finalFilteredRounds = finalTransformedRounds.filter((round) => round.statut === roundStatus);
      logs.push(`   - ${finalTransformedRounds.length - finalFilteredRounds.length} tournées écartées.`);
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
    driverName?: string; // Corrected from nomCompletChauffeur
    nomHub?: string;
    status: 'à traiter' | 'traité';
  }[]
) {
  try {
    const { firestore } = await initializeFirebaseOnServer();
    const batch = firestore.batch();
    
    categorizedComments.forEach(comment => {
      if (comment.taskId) {
        const docRef = firestore.collection("categorized_comments").doc(comment.taskId);
        // The comment object passed in now contains the correct status
        batch.set(docRef, comment, { merge: true });
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


// --- Save Processed Verbatims (Batch) ---
export async function saveProcessedVerbatimsAction(verbatims: ProcessedVerbatim[]) {
  try {
    const { firestore } = await initializeFirebaseOnServer();
    const batch = firestore.batch();
    
    verbatims.forEach(verbatim => {
        if (!verbatim.associationDate) {
            throw new Error(`La date d'association est manquante pour le verbatim de la tâche ${verbatim.taskId}.`);
        }
        
        const docRef = firestore.collection("processed_nps_verbatims").doc(verbatim.taskId);

        const dataToSave: Omit<ProcessedVerbatim, 'id'> & { status: 'traité' } = {
          ...verbatim,
          status: 'traité',
        };
        
        delete (dataToSave as any).taskDate; // Avoid potential conflicts if field exists
        
        batch.set(docRef, dataToSave, { merge: true });
    });

    await batch.commit();
    return { success: true, error: null };

  } catch (error: any) {
    console.error("Error batch saving processed verbatims:", error);
    return {
      success: false,
      error: error.message || "Failed to save processed verbatims to Firestore.",
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
        let batchCount = 0;
        for (let i = 0; i < idsToDelete.length; i += deleteBatchSize) {
            batchCount++;
            const batch = collectionRef.firestore.batch();
            const chunk = idsToDelete.slice(i, i + deleteBatchSize);
            chunk.forEach(idToDelete => {
                const docToDelete = existingDocsMap.get(idToDelete);
                if (docToDelete && docToDelete.__docId) {
                    batch.delete(collectionRef.doc(docToDelete.__docId));
                }
            });
            await batch.commit();
            logs.push(`      - Lot de suppression ${Math.floor(i / deleteBatchSize) + 1}/${Math.ceil(idsToDelete.length / deleteBatchSize)} terminé.`);
            
            if (batchCount % 5 === 0 && idsToDelete.length > (i + deleteBatchSize)) {
                logs.push(`      - ⏱️ Grosse pause de 10 secondes après 5 lots de suppression...`);
                await delay(10000);
            } else if (idsToDelete.length > deleteBatchSize) {
                await delay(1500);
            }
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
        let batchCount = 0;
        for (let i = 0; i < itemsToUpdate.length; i += writeBatchSize) {
            batchCount++;
            const currentBatchNumber = Math.floor(i / writeBatchSize) + 1;
            const batch = collectionRef.firestore.batch();
            const chunk = itemsToUpdate.slice(i, i + writeBatchSize);

            chunk.forEach(item => {
                const docId = collectionName === 'tasks' ? item['id'] : item[idKey];
                if (docId) {
                    const docRef = collectionRef.doc(String(docId));
                    const dataToSet: { [key: string]: any } = {};
                    Object.keys(item).forEach(key => {
                        const value = item[key];
                        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
                            try { dataToSet[key] = new Date(value); } catch (e) { dataToSet[key] = value; }
                        } else {
                            dataToSet[key] = value;
                        }
                    });
                    batch.set(docRef, dataToSet, { merge: true });
                }
            });

            logs.push(`      - Écriture du lot ${currentBatchNumber}/${Math.ceil(itemsToUpdate.length / writeBatchSize)}...`);
            await batch.commit();
            logs.push(`      - ✅ Lot ${currentBatchNumber} sauvegardé.`);

            if (batchCount % 5 === 0 && itemsToUpdate.length > (i + writeBatchSize)) {
                logs.push(`      - ⏱️ Grosse pause de 10 secondes après 5 lots d'écriture...`);
                await delay(10000);
            } else if (itemsToUpdate.length > writeBatchSize) {
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

    let allRawRounds: any[] = [];
    const dateCursorRounds = startOfDay(from);
     while (dateCursorRounds <= to) {
      const dateString = format(dateCursorRounds, 'yyyy-MM-dd');
      logs.push(`\n🗓️  Traitement des tournées pour le ${dateString}...`);
      allRawRounds.push(...await fetchAllRounds(apiKey, new URLSearchParams({ date: dateString }), logs));
      dateCursorRounds.setDate(dateCursorRounds.getDate() + 1);
    }
    logs.push(`\n✅ ${allRawRounds.length} tournées brutes récupérées au total.`);


    let allRawTasks: any[] = [];
    const dateCursorTasks = startOfDay(from);
    while (dateCursorTasks <= to) {
        const dateString = format(dateCursorTasks, 'yyyy-MM-dd');
        logs.push(`\n🗓️  Traitement des tâches pour le ${dateString}...`);
        allRawTasks.push(...await fetchAllTasks(apiKey, new URLSearchParams({ date: dateString }), logs));
        dateCursorTasks.setDate(dateCursorTasks.getDate() + 1);
    }
    logs.push(`\n✅ ${allRawTasks.length} tâches brutes récupérées au total.`);

    logs.push(`\n\n🔄 Transformation et enrichissement des données...`);
    
    const transformedRounds: Tournee[] = allRawRounds.map(rawRound => transformRoundData(rawRound, []));
    logs.push(`   - ${transformedRounds.length} tournées initialement transformées.`);

    const transformedTasks: Tache[] = allRawTasks.map(rawTask => transformTaskData(rawTask, transformedRounds));
    logs.push(`   - ${transformedTasks.length} tâches transformées.`);
    
    const finalTransformedRounds: Tournee[] = allRawRounds.map(rawRound => transformRoundData(rawRound, transformedTasks));
    logs.push(`   - ${finalTransformedRounds.length} tournées finalisées avec calculs.`);


    // --- SAVE TO FIRESTORE ---
    logs.push(`\n💾 Début de la sauvegarde intelligente dans Firestore...`);
    
    const tasksCollectionRef = firestore.collection('tasks');
    const roundsCollectionRef = firestore.collection('rounds');

    await saveCollectionInAction(tasksCollectionRef, transformedTasks, 'id', { from, to }, logs);
    await saveCollectionInAction(roundsCollectionRef, finalTransformedRounds, 'id', { from, to }, logs);
    
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
    // 2. Overweight Rounds
    const overweightRounds = finalTransformedRounds.filter(r => r.poidsReel && r.poidsReel > 1250);
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
      logs,
    };
  }
}
