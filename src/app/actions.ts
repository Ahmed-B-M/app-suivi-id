"use server";

import { z } from "zod";
import {
  exportFormSchema,
  roundExportFormSchema,
  schedulerSchema,
} from "@/lib/schemas";
import { optimizeApiCallSchedule } from "@/ai/flows/optimize-api-call-schedule";
import { initializeFirebaseOnServer } from "@/firebase/server-init";

// --- Task Fetching Logic ---
async function fetchTasks(
  apiKey: string,
  params: URLSearchParams,
  logs: string[]
) {
  const pageSize = 500;
  let page = 0;
  let hasMoreData = true;
  const allTasks: any[] = [];

  while (hasMoreData) {
    const url = new URL("https://api.urbantz.com/v2/task");
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

    const tasks = await response.json();
    logs.push(`    - ${tasks.length} tâches brutes récupérées.`);

    if (tasks.length > 0) {
      allTasks.push(...tasks);
      page++;
    } else {
      hasMoreData = false;
      if (page === 0) {
        logs.push(`    - Aucune tâche trouvée pour ces paramètres.`);
      } else {
        logs.push(`    - Fin des données pour ces paramètres.`);
      }
    }
  }
  return allTasks;
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
  const pageSize = 500;
  let page = 0;
  let hasMoreData = true;
  const allRounds: any[] = [];

  while (hasMoreData) {
    const url = new URL("https://api.urbantz.com/v2/round");
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

    const rounds = await response.json();
    logs.push(`    - ${rounds.length} tournées brutes récupérées.`);

    if (rounds.length > 0) {
      allRounds.push(...rounds);
      page++;
    } else {
      hasMoreData = false;
      if (page === 0) {
        logs.push(`    - Aucune tournée trouvée pour ces paramètres.`);
      } else {
        logs.push(`    - Fin des données pour ces paramètres.`);
      }
    }
  }
  return allRounds;
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

export async function saveDataToFirestoreAction(dataType: 'tasks' | 'rounds', data: any[]) {
    const logs: string[] = [];
    try {
        const { firestore: db } = initializeFirebaseOnServer();

        logs.push(`\n💾 Sauvegarde de ${data.length} ${dataType} dans Firestore...`);

        const collectionName = dataType;
        const batch = db.batch();
        const collectionRef = db.collection(collectionName);
        
        data.forEach((item) => {
            const docId = item.id || item._id;
            if (docId) {
                const docRef = collectionRef.doc(docId);
                batch.set(docRef, item, { merge: true });
            }
        });

        await batch.commit();

        logs.push(`\n✨ Données sauvegardées dans Firestore !`);
        return { logs, error: null };
    } catch (e) {
        const errorMsg = "❌ Une erreur est survenue lors de la sauvegarde dans Firestore.";
        logs.push(errorMsg);
        if (e instanceof Error) {
            logs.push(e.message);
        }
        return { logs, error: errorMsg };
    }
}
