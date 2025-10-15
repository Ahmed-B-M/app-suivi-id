"use server";

import { z } from "zod";
import { exportFormSchema, schedulerSchema } from "@/lib/schemas";
import { optimizeApiCallSchedule } from "@/ai/flows/optimize-api-call-schedule";

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

    logs.push(`    - Récupération de la page ${page + 1} avec les paramètres: ${params.toString()}`);

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
      // We stop fetching for this set of parameters on error
      hasMoreData = false; 
      // We don't throw an error to allow other loops to continue
      continue;
    }

    const tasks = await response.json();
    logs.push(`    - ${tasks.length} tâches brutes récupérées.`);

    if (tasks.length > 0) {
      allTasks.push(...tasks);
      page++;
    } else {
      hasMoreData = false;
      if(page === 0) {
        logs.push(`    - Aucune tâche trouvée pour ces paramètres.`);
      } else {
        logs.push(`    - Fin des données pour ces paramètres.`);
      }
    }
  }
  return allTasks;
}


// --- Export Action ---
export async function runExportAction(values: z.infer<typeof exportFormSchema>) {
  const validatedFields = exportFormSchema.safeParse(values);
  if (!validatedFields.success) {
    return { logs: [], jsonData: null, error: "Invalid input." };
  }

  const { apiKey, from, to, status, taskId, roundId, unplanned } = validatedFields.data;
  const logs: string[] = [];

  try {
    logs.push(`🚀 Début de l'interrogation...`);
    logs.push(`   - Clé API: ********${apiKey.slice(-4)}`);
    
    const baseParams = new URLSearchParams();
    if(status) baseParams.append("progress", status);
    if(taskId) baseParams.append("taskId", taskId);
    if(roundId) baseParams.append("round", roundId);
    if(unplanned) baseParams.append("unplanned", "true");


    logs.push(`   - Filtres: ${baseParams.toString() || 'Aucun'}`);
    
    const allTasks: any[] = [];
    logs.push(`\n🛰️  Interrogation de l'API Urbantz...`);

    if (unplanned) {
        logs.push(`\n🗓️  Traitement des tâches non planifiées...`);
        const unplannedTasks = await fetchTasks(apiKey, baseParams, logs);
        allTasks.push(...unplannedTasks);
    } else {
        logs.push(
          `   - Période: ${from.toISOString().split("T")[0]} à ${
            to.toISOString().split("T")[0]
          }`
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
        logs.push(`\n⚠️ Aucune donnée récupérée pour les filtres sélectionnés.`);
        return {
            logs,
            jsonData: [],
            error: null,
        }
    }

    logs.push(`\n✅ ${allTasks.length} tâches brutes récupérées au total.`);
    logs.push(
      `\n🔄 Sauvegarde des données brutes dans 'donnees_urbantz_tasks_filtrees.json'...`
    );
    logs.push(`\n🎉 Fichier prêt à être téléchargé!`);

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
      error: "Failed to get schedule from AI. Please check your inputs and try again.",
    };
  }
}
