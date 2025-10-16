
"use client";

import { useMemo } from "react";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { DashboardStats } from "@/components/app/dashboard-stats";
import { TasksByStatusChart } from "@/components/app/tasks-by-status-chart";
import { TasksOverTimeChart } from "@/components/app/tasks-over-time-chart";
import type { Task, Round } from "@/lib/types";

export default function DashboardPage() {
  const { firestore } = useFirebase();

  const tasksCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "tasks");
  }, [firestore]);

  const roundsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "rounds");
  }, [firestore]);

  const {
    data: tasks,
    isLoading: isLoadingTasks,
    error: tasksError,
  } = useCollection<Task>(tasksCollection);

  const {
    data: rounds,
    isLoading: isLoadingRounds,
    error: roundsError,
  } = useCollection<Round>(roundsCollection);

  const dashboardData = useMemo(() => {
    if (!tasks && !rounds) return null;

    const taskStats = tasks
      ? {
          totalTasks: tasks.length,
          completedTasks: tasks.filter(
            (t) => t.progress === "COMPLETED"
          ).length,
          unplannedTasks: tasks.filter((t) => t.unplanned).length,
        }
      : { totalTasks: 0, completedTasks: 0, unplannedTasks: 0 };

    const roundStats = rounds
      ? {
          totalRounds: rounds.length,
        }
      : { totalRounds: 0 };

    const tasksByStatus = tasks
      ? tasks.reduce((acc, task) => {
          const status = task.progress || "Unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {};

    const tasksOverTime = tasks
      ? tasks.reduce((acc, task) => {
          const date = task.date ? task.date.split("T")[0] : "Unplanned";
          if (date === "Unplanned" && !task.unplanned) return acc;
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {};

    return {
      stats: { ...taskStats, ...roundStats },
      tasksByStatus: Object.entries(tasksByStatus).map(([name, value]) => ({
        name,
        value,
      })),
      tasksOverTime: Object.entries(tasksOverTime)
        .map(([date, count]) => ({
          date,
          count,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    };
  }, [tasks, rounds]);

  const isLoading = isLoadingTasks || isLoadingRounds;
  const error = tasksError || roundsError;

  return (
    <main className="flex-1 container py-8">
      <h1 className="text-3xl font-bold mb-8">Tableau de Bord</h1>

      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      )}

      {error && (
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle />
              Erreur de chargement des données
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Impossible de charger les données depuis Firestore. Veuillez vérifier vos
              permissions et la configuration de votre projet.
            </p>
            <pre className="mt-4 text-sm bg-background p-2 rounded">
              {error.message}
            </pre>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && dashboardData && (
        <Card>
          <CardHeader>
            <CardTitle>Aperçu des Données Sauvegardées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <DashboardStats stats={dashboardData.stats} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dashboardData.tasksByStatus.length > 0 && (
                <TasksByStatusChart data={dashboardData.tasksByStatus} />
              )}
              {dashboardData.tasksOverTime.length > 0 && (
                <TasksOverTimeChart data={dashboardData.tasksOverTime} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && !dashboardData && (
          <Card>
              <CardContent className="pt-6">
                  <p className="text-muted-foreground">Aucune donnée trouvée dans la base de données. Veuillez d'abord exporter et sauvegarder des données.</p>
              </CardContent>
          </Card>
      )}
    </main>
  );
}
