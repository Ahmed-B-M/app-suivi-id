"use server";

import { z } from "zod";
import { exportFormSchema, schedulerSchema } from "@/lib/schemas";
import { optimizeApiCallSchedule } from "@/ai/flows/optimize-api-call-schedule";

async function fetchTasksForDay(
  apiKey: string,
  date: string,
  hub: string | null,
  page: number,
  logs: string[]
) {
  const pageSize = 500;
  const url = new URL("https://api.urbantz.com/v2/task");
  url.searchParams.append("date", date);
  url.searchParams.append("page", page.toString());
  url.searchParams.append("pageSize", pageSize.toString());
  if (hub) {
    url.searchParams.append("hub", hub);
  }

  logs.push(`    - Récupération de la page ${page + 1} pour le hub ${hub || 'tous'}...`);

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
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const tasks = await response.json();
  logs.push(`    - ${tasks.length} tâches brutes récupérées.`);
  return tasks;
}

// --- Export Action ---
export async function runExportAction(values: z.infer<typeof exportFormSchema>) {
  const validatedFields = exportFormSchema.safeParse(values);
  if (!validatedFields.success) {
    return { logs: [], jsonData: null, error: "Invalid input." };
  }

  const { apiKey, from, to, hubs } = validatedFields.data;
  const logs: string[] = [];

  try {
    logs.push(`🚀 Début de l'interrogation...`);
    logs.push(`   - Clé API: ********${apiKey.slice(-4)}`);
    logs.push(
      `   - Période: ${from.toISOString().split("T")[0]} à ${
        to.toISOString().split("T")[0]
      }`
    );
    const hubIds = hubs ? hubs.split(",").map((h) => h.trim()).filter(h => h) : [];
    logs.push(`   - Hubs: ${hubIds.length > 0 ? hubIds.join(', ') : 'Tous les hubs'}`);

    const allTasks: any[] = [];
    logs.push(`\n🛰️  Interrogation de l'API Urbantz...`);

    const dateCursor = new Date(from);
    while (dateCursor <= to) {
      const dateString = dateCursor.toISOString().split("T")[0];
      logs.push(`\n🗓️  Traitement du ${dateString}...`);
      
      const targetHubs = hubIds.length > 0 ? hubIds : [null];

      for (const hub of targetHubs) {
        let page = 0;
        let hasMoreData = true;
        while (hasMoreData) {
          try {
            const tasks = await fetchTasksForDay(apiKey, dateString, hub, page, logs);
            if (tasks.length > 0) {
              allTasks.push(...tasks);
              page++;
            } else {
              hasMoreData = false;
              if(page === 0){
                logs.push(`    - Aucune tâche trouvée pour le hub ${hub || 'tous'} ce jour-là.`);
              } else {
                logs.push(`    - Fin des données pour le hub ${hub || 'tous'}.`);
              }
            }
          } catch (error) {
            if (error instanceof Error) {
                logs.push(`    - ❌ Erreur lors de la récupération pour le hub ${hub || 'tous'}: ${error.message}`);
            }
            // Stop trying for this hub if an error occurs
            hasMoreData = false; 
          }
        }
      }
      dateCursor.setDate(dateCursor.getDate() + 1);
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
