"use server";

import { z } from "zod";
import {
  exportFormSchema,
  roundExportFormSchema,
  schedulerSchema,
} from "@/lib/schemas";
import { optimizeApiCallSchedule } from "@/ai/flows/optimize-api-call-schedule";
import { Task } from "@/lib/types";

/**
 * Transforms a raw task object from the Urbantz API into the desired structure,
 * keeping only the user-specified fields.
 * @param rawTask - The raw task object from the API.
 * @returns A new, filtered task object.
 */
function transformTaskData(rawTask: any): Task {
  return {
    // Base fields
    _id: rawTask._id,
    id: rawTask.id || rawTask._id,
    taskId: rawTask.taskId,
    type: rawTask.type,
    date: rawTask.date,
    progress: rawTask.progress,
    client: rawTask.client,
    platformName: rawTask.platformName,
    when: rawTask.when,
    closureDate: rawTask.closureDate,
    updated: rawTask.updated,
    attempts: rawTask.attempts,
    completedBy: rawTask.completedBy,
    
    // Round info
    hubName: rawTask.hubName,
    roundName: rawTask.roundName,
    sequence: rawTask.sequence,
    associatedName: rawTask.associatedName,
    driver: rawTask.driver ? {
      firstName: rawTask.driver.firstName,
      lastName: rawTask.driver.lastName,
    } : undefined,

    // Time info
    timeWindow: rawTask.timeWindow ? {
      start: rawTask.timeWindow.start,
      stop: rawTask.timeWindow.stop,
    } : undefined,
    actualTime: rawTask.actualTime ? {
      arrive: rawTask.actualTime.arrive ? {
        when: rawTask.actualTime.arrive.when,
        isCorrectAddress: rawTask.actualTime.arrive.isCorrectAddress,
      } : undefined,
    } : undefined,
    realServiceTime: rawTask.realServiceTime ? {
      startTime: rawTask.realServiceTime.startTime,
      endTime: rawTask.realServiceTime.endTime,
      serviceTime: rawTask.realServiceTime.serviceTime,
    } : undefined,
    serviceTime: rawTask.serviceTime,

    // Contact and location
    contact: rawTask.contact ? {
      person: rawTask.contact.person,
      phone: rawTask.contact.phone,
      email: rawTask.contact.email,
      buildingInfo: rawTask.contact.buildingInfo ? {
        floor: rawTask.contact.buildingInfo.floor,
        hasElevator: rawTask.contact.buildingInfo.hasElevator,
        digicode1: rawTask.contact.buildingInfo.digicode1,
        hasInterphone: rawTask.contact.buildingInfo.hasInterphone,
        interphoneCode: rawTask.contact.buildingInfo.interphoneCode,
      } : undefined,
    } : undefined,
    location: rawTask.location ? {
      address: rawTask.location.address,
      street: rawTask.location.street,
      number: rawTask.location.number,
      zip: rawTask.location.zip,
      city: rawTask.location.city,
      countryCode: rawTask.location.countryCode,
      geometry: rawTask.location.location?.geometry,
    } : undefined,
    instructions: rawTask.instructions,

    // Order details
    dimensions: rawTask.dimensions ? {
      volume: rawTask.dimensions.volume,
      bac: rawTask.dimensions.bac,
      poids: rawTask.dimensions.poids,
    } : undefined,
    items: Array.isArray(rawTask.items) ? rawTask.items.map((item: any) => ({
      name: item.name,
      status: item.status,
      barcode: item.barcode,
      type: item.type,
      dimensions: item.dimensions ? {
        poids: item.dimensions.poids,
      } : undefined,
      log: Array.isArray(item.log) ? item.log.map((logEntry: any) => ({
        when: logEntry.when,
        to: logEntry.to,
      })) : undefined,
    })) : undefined,

    // Execution & Metadata
    execution: rawTask.execution ? {
      contactless: rawTask.execution.contactless,
    } : undefined,
    metadata: rawTask.metadata ? {
      notationLivreur: rawTask.metadata.notationLivreur,
      commentaireLivr: rawTask.metadata.commentaireLivr,
      building: rawTask.metadata.building,
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
) {
  // Appelle la fonction générique avec l'endpoint 'round'.
  return fetchGeneric("round", apiKey, params, logs);
}

// --- Action d'Exportation des Tournées ---
export async function runRoundExportAction(
  values: z.infer<typeof roundExportFormSchema>
) {
  const validatedFields = roundExportFormSchema.safeParse(values);
  if (!validatedFields.success) {
    return { logs: [], jsonData: null, error: "Invalid input." };
  }

  const { apiKey, from, to, status } = validatedFields.data;
  const logs: string[] = [];

  try {
    logs.push(`🚀 Début de l'interrogation des tournées...`);
    logs.push(`   - Clé API: ********${apiKey.slice(-4)}`);

    // L'API 'round' ne supporte pas de filtre 'status' directement.
    // On va donc récupérer toutes les tournées pour la période, puis filtrer manuellement.
    const baseParams = new URLSearchParams();

    const allRounds: any[] = [];
    logs.push(`\n🛰️  Interrogation de l'API Urbantz pour les tournées...`);

    const fromString = from.toISOString().split("T")[0];
    const toString = to.toISOString().split("T")[0];
    logs.push(
      `   - Période: ${fromString} à ${toString}`
    );

    // Boucle sur chaque jour pour récupérer les tournées.
    const dateCursor = new Date(from);
    while (dateCursor <= to) {
      const dateString = dateCursor.toISOString().split("T")[0];
      logs.push(`\n🗓️  Traitement du ${dateString}...`);

      const paramsForDay = new URLSearchParams(baseParams);
      paramsForDay.append("date", dateString); // Le seul filtre API utilisé ici est la date.

      const roundsForDay = await fetchRounds(apiKey, paramsForDay, logs);
      allRounds.push(...roundsForDay);

      dateCursor.setDate(dateCursor.getDate() + 1);
    }

    let filteredRounds = allRounds;
    // ** FILTRAGE CÔTÉ APPLICATION **
    // Si un statut est sélectionné (et différent de 'tous'), on filtre le tableau 'allRounds'.
    if (status && status !== "all") {
      logs.push(`\n🔄 Filtrage des tournées par statut: ${status}`);
      // La fonction .filter() de JavaScript crée un nouveau tableau avec seulement les éléments qui passent le test.
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
