"use server";

import { z } from "zod";
import { exportFormSchema, schedulerSchema } from "@/lib/schemas";
import { optimizeApiCallSchedule } from "@/ai/flows/optimize-api-call-schedule";

// --- Mock Data ---
function createMockTask(id: number) {
  return {
    id: `task_${id}`,
    status: Math.random() > 0.2 ? "completed" : "failed",
    creationDate: new Date(
      Date.now() - Math.floor(Math.random() * 1000000000)
    ).toISOString(),
    hub: `hub_${(id % 6) + 1}`,
    driver: `driver_${id % 20}`,
    vehicle: `vehicle_${id % 10}`,
    eta: new Date(Date.now() + Math.floor(Math.random() * 100000000)).toISOString(),
  };
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
      `   - Période: ${
        from.toISOString().split("T")[0]
      } à ${to.toISOString().split("T")[0]}`
    );
    logs.push(`   - Hubs: ${hubs.split(",").length} hubs sélectionnés`);

    const allTasks: any[] = [];
    const totalPages = Math.floor(Math.random() * 3) + 3; // Simulate 3-5 pages

    logs.push(`\n🛰️  Interrogation de l'API Urbantz...`);

    for (let page = 0; page < totalPages; page++) {
      logs.push(`    - Récupération de la page ${page + 1}/${totalPages}...`);
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 500 + 250)
      );

      const isLastPage = page === totalPages - 1;
      const tasksOnPage = isLastPage ? 0 : Math.floor(Math.random() * 5) + 8; // 8-12 tasks per page
      
      if (tasksOnPage === 0) {
        logs.push(`    - Fin des données, arrêt de la récupération.`);
        break;
      }
      
      const newTasks = Array.from({ length: tasksOnPage }, (_, i) =>
        createMockTask(page * 10 + i)
      );
      allTasks.push(...newTasks);
      logs.push(`    - ${newTasks.length} tâches brutes récupérées.`);
    }

    if (allTasks.length === 0) {
        logs.push(`\n⚠️ Aucune donnée récupérée.`);
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
