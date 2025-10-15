"use server";

import { z } from "zod";
import {
  exportFormSchema,
  roundExportFormSchema,
  schedulerSchema,
  hubExportFormSchema,
  customerExportFormSchema,
  ticketExportFormSchema,
} from "@/lib/schemas";
import { optimizeApiCallSchedule } from "@/ai/flows/optimize-api-call-schedule";
import { initializeFirebaseOnServer } from "@/firebase/server-init";

async function fetchGeneric(
    endpoint: 'task' | 'round' | 'hub' | 'customer' | 'tickets',
    apiKey: string,
    params: URLSearchParams,
    logs: string[]
) {
    const pageSize = 500;
    let page = 0;
    let hasMoreData = true;
    const allItems: any[] = [];
    const itemName = endpoint === 'customer' ? 'client' : endpoint;

    while (hasMoreData) {
        const basePath = 'v2';
        const url = new URL(`https://api.urbantz.com/${basePath}/${endpoint}`);
        params.forEach((value, key) => url.searchParams.append(key, value));
        url.searchParams.append("page", page.toString());
        url.searchParams.append("pageSize", pageSize.toString());

        logs.push(
            `    - Récupération de la page ${
                page + 1
            } avec les paramètres: ${params.toString()}`
        );

        const response = await fetch(url.toString(), {
            headers: {
                "x-api-key": apiKey,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            logs.push(
                `    - ❌ Erreur API: ${response.status} ${response.statusText}. ${errorText}`
            );
            hasMoreData = false;
            continue;
        }

        const items = await response.json();
        logs.push(`    - ${items.length} ${itemName}s bruts récupérés.`);

        if (items.length > 0) {
            allItems.push(...items);
            page++;
        } else {
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


// --- Task Fetching Logic ---
async function fetchTasks(
  apiKey: string,
  params: URLSearchParams,
  logs: string[]
) {
  return fetchGeneric("task", apiKey, params, logs);
}

// --- Task Export Action ---
export async function runExportAction(
  values: z.infer<typeof exportFormSchema>
) {
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

    const baseParams = new URLSearchParams();
    if (status && status !== "all") baseParams.append("progress", status);
    if (taskId) baseParams.append("taskId", taskId);
    if (roundId) baseParams.append("round", roundId);
    if (unplanned) baseParams.append("unplanned", "true");

    logs.push(`   - Filtres: ${baseParams.toString() || "Aucun"}`);

    const allTasks: any[] = [];
    logs.push(`\n🛰️  Interrogation de l'API Urbantz pour les tâches...`);
    
    if (unplanned) {
        logs.push(`\n🗓️  Traitement des tâches non planifiées...`);
        const unplannedTasks = await fetchTasks(apiKey, baseParams, logs);
        allTasks.push(...unplannedTasks);
    } else {
        const fromString = from.toISOString().split("T")[0];
        const toString = to.toISOString().split("T")[0];
        logs.push(
            `   - Période: ${fromString} à ${toString}`
        );
        const dateCursor = new Date(from);
        while (dateCursor <= to) {
            const dateString = dateCursor.toISOString().split("T")[0];
            logs.push(`\n🗓️  Traitement du ${dateString}...`);

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

    logs.push(`\n✅ ${allTasks.length} tâches brutes récupérées au total.`);
    logs.push(
      `\n🔄 Sauvegarde des données brutes dans 'donnees_urbantz_tasks_filtrees.json'...`
    );
    logs.push(`\n🎉 Fichier prêt à être téléchargé!`);
    logs.push(`\n✨ Cliquez sur 'Sauvegarder dans Firestore' pour enregistrer les données.`);

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

// --- Round Fetching Logic ---
async function fetchRounds(
  apiKey: string,
  params: URLSearchParams,
  logs: string[]
) {
  return fetchGeneric("round", apiKey, params, logs);
}

// --- Round Export Action ---
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

    const baseParams = new URLSearchParams();
    if (status && status !== "all") {
    }

    const allRounds: any[] = [];
    logs.push(`\n🛰️  Interrogation de l'API Urbantz pour les tournées...`);

    const fromString = from.toISOString().split("T")[0];
    const toString = to.toISOString().split("T")[0];
    logs.push(
      `   - Période: ${fromString} à ${toString}`
    );

    const dateCursor = new Date(from);
    while (dateCursor <= to) {
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

// --- Hub Export Action ---
export async function runHubExportAction(
  values: z.infer<typeof hubExportFormSchema>
) {
  const validatedFields = hubExportFormSchema.safeParse(values);
  if (!validatedFields.success) {
    return { logs: [], jsonData: null, error: "Invalid input." };
  }

  const { apiKey } = validatedFields.data;
  const logs: string[] = [];

  try {
    logs.push(`🚀 Début de l'interrogation des hubs...`);
    logs.push(`   - Clé API: ********${apiKey.slice(-4)}`);

    const params = new URLSearchParams();
    const allHubs = await fetchGeneric("hub", apiKey, params, logs);

    if (allHubs.length === 0) {
      logs.push(`\n⚠️ Aucun hub récupéré.`);
      return { logs, jsonData: [], error: null };
    }

    logs.push(`\n✅ ${allHubs.length} hubs récupérés au total.`);
    logs.push(`\n🎉 Fichier prêt à être téléchargé!`);
    logs.push(`\n✨ Cliquez sur 'Sauvegarder dans Firestore' pour enregistrer les données.`);

    return {
      logs,
      jsonData: allHubs,
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

// --- Customer Export Action ---
export async function runCustomerExportAction(
  values: z.infer<typeof customerExportFormSchema>
) {
  const validatedFields = customerExportFormSchema.safeParse(values);
  if (!validatedFields.success) {
    return { logs: [], jsonData: null, error: "Invalid input." };
  }

  const { apiKey } = validatedFields.data;
  const logs: string[] = [];

  try {
    logs.push(`🚀 Début de l'interrogation des clients...`);
    logs.push(`   - Clé API: ********${apiKey.slice(-4)}`);

    const params = new URLSearchParams();
    const allCustomers = await fetchGeneric("customer", apiKey, params, logs);

     if (allCustomers.length === 0) {
      logs.push(`\n⚠️ Aucun client récupéré.`);
      return { logs, jsonData: [], error: null };
    }

    logs.push(`\n✅ ${allCustomers.length} clients récupérés au total.`);
    logs.push(`\n🎉 Fichier prêt à être téléchargé!`);
    logs.push(`\n✨ Cliquez sur 'Sauvegarder dans Firestore' pour enregistrer les données.`);


    return {
      logs,
      jsonData: allCustomers,
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

// --- Ticket Export Action ---
export async function runTicketExportAction(
  values: z.infer<typeof ticketExportFormSchema>
) {
  const validatedFields = ticketExportFormSchema.safeParse(values);
  if (!validatedFields.success) {
    return { logs: [], jsonData: null, error: "Invalid input." };
  }

  const { apiKey, from, to } = validatedFields.data;
  const logs: string[] = [];

  try {
    logs.push(`🚀 Début de l'interrogation des tickets...`);
    logs.push(`   - Clé API: ********${apiKey.slice(-4)}`);

    const allTickets: any[] = [];
    logs.push(`\n🛰️  Interrogation de l'API Urbantz pour les tickets...`);

    const fromString = from.toISOString().split("T")[0];
    const toString = to.toISOString().split("T")[0];
    logs.push(`   - Période: ${fromString} à ${toString}`);

    const dateCursor = new Date(from);
    while (dateCursor <= to) {
      const dateString = dateCursor.toISOString().split("T")[0];
      logs.push(`\n🗓️  Traitement du ${dateString}...`);

      const paramsForDay = new URLSearchParams();
      paramsForDay.append("date", dateString);

      const ticketsForDay = await fetchGeneric("tickets", apiKey, paramsForDay, logs);
      allTickets.push(...ticketsForDay);

      dateCursor.setDate(dateCursor.getDate() + 1);
    }

    if (allTickets.length === 0) {
      logs.push(`\n⚠️ Aucun ticket récupéré.`);
      return { logs, jsonData: [], error: null };
    }

    logs.push(`\n✅ ${allTickets.length} tickets récupérés au total.`);
    logs.push(`\n🎉 Fichier prêt à être téléchargé!`);
    logs.push(`\n✨ Cliquez sur 'Sauvegarder dans Firestore' pour enregistrer les données.`);

    return {
      logs,
      jsonData: allTickets,
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

// --- Scheduler Action ---
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

// --- Firestore Save Actions ---

export async function saveDataToFirestoreAction(dataType: 'tasks' | 'rounds' | 'hubs' | 'customers' | 'tickets', data: any[]) {
    const logs: string[] = [];
    try {
        const { firestore: db } = initializeFirebaseOnServer();

        logs.push(`\n💾 Sauvegarde de ${data.length} ${dataType} dans Firestore...`);

        const collectionName = dataType;
        const collectionRef = db.collection(collectionName);
        const batchSize = 450; // Firestore batch limit is 500, being safe

        for (let i = 0; i < data.length; i += batchSize) {
            const chunk = data.slice(i, i + batchSize);
            const batch = db.batch();
            
            logs.push(`   - Traitement du lot ${i / batchSize + 1}... (${chunk.length} documents)`);

            chunk.forEach((item) => {
                const docId = item.id || item._id;
                if (docId) {
                    const docRef = collectionRef.doc(docId.toString());
                    batch.set(docRef, item, { merge: true });
                }
            });

            await batch.commit();
            logs.push(`   - Lot ${i / batchSize + 1} sauvegardé.`);
        }

        logs.push(`\n✨ ${data.length} documents sauvegardés dans Firestore !`);
        return { logs, error: null };
    } catch (e) {
        const errorMsg = "❌ Une erreur est survenue lors de la sauvegarde dans Firestore.";
        logs.push(errorMsg);
        if (e instanceof Error) {
            logs.push(e.message);
            console.error(e);
        }
        return { logs, error: errorMsg };
    }
}
