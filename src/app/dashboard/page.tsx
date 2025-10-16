
"use client";

import { useMemo, useState } from "react";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { DashboardStats } from "@/components/app/dashboard-stats";
import { TasksByStatusChart } from "@/components/app/tasks-by-status-chart";
import { TasksOverTimeChart } from "@/components/app/tasks-over-time-chart";
import type { Task, Round } from "@/lib/types";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, subDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

export default function DashboardPage() {
  const { firestore } = useFirebase();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

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

  const filteredData = useMemo(() => {
    const { from, to } = dateRange || {};

    const filterByDate = (item: Task | Round) => {
      if (!from || !to) return true;
      if (!item.date) return false;
      const itemDate = new Date(item.date);
      return itemDate >= from && itemDate <= to;
    };

    const filteredTasks = tasks?.filter(filterByDate) || [];
    const filteredRounds = rounds?.filter(filterByDate) || [];

    return { tasks: filteredTasks, rounds: filteredRounds };
  }, [tasks, rounds, dateRange]);

  const dashboardData = useMemo(() => {
    if (!filteredData.tasks && !filteredData.rounds) return null;

    const taskStats = filteredData.tasks
      ? {
          totalTasks: filteredData.tasks.length,
          completedTasks: filteredData.tasks.filter(
            (t) => t.progress === "COMPLETED"
          ).length,
          unplannedTasks: filteredData.tasks.filter((t) => t.unplanned).length,
        }
      : { totalTasks: 0, completedTasks: 0, unplannedTasks: 0 };

    const roundStats = filteredData.rounds
      ? {
          totalRounds: filteredData.rounds.length,
        }
      : { totalRounds: 0 };

    const tasksByStatus = filteredData.tasks
      ? filteredData.tasks.reduce((acc, task) => {
          const status = task.progress || "Unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {};

    const tasksOverTime = filteredData.tasks
      ? filteredData.tasks.reduce((acc, task) => {
          const date = task.date ? task.date.split("T")[0] : "Unplanned";
          if (date === "Unplanned" && !task.unplanned) return acc;
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {};

    const hasData = filteredData.tasks.length > 0 || filteredData.rounds.length > 0;

    return {
      hasData,
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
  }, [filteredData]);

  const isLoading = isLoadingTasks || isLoadingRounds;
  const error = tasksError || roundsError;

  return (
    <main className="flex-1 container py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Tableau de Bord</h1>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Choisir une période</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

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

      {!isLoading && !error && dashboardData && dashboardData.hasData && (
        <Card>
          <CardHeader>
            <CardTitle>Aperçu des Données Sauvegardées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <DashboardStats stats={dashboardData.stats} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dashboardData.tasksByStatus.length > 0 ? (
                <TasksByStatusChart data={dashboardData.tasksByStatus} />
              ) : (
                 <Card className="flex items-center justify-center h-96">
                  <p className="text-muted-foreground">Aucune donnée de tâche par statut pour cette période.</p>
                </Card>
              )}
               {dashboardData.tasksOverTime.length > 0 ? (
                <TasksOverTimeChart data={dashboardData.tasksOverTime} />
              ) : (
                <Card className="flex items-center justify-center h-96">
                  <p className="text-muted-foreground">Aucune donnée de tâche par jour pour cette période.</p>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && dashboardData && !dashboardData.hasData && (
          <Card>
              <CardContent className="pt-6">
                  <p className="text-muted-foreground">Aucune donnée trouvée dans la base de données pour la période sélectionnée. Veuillez ajuster les dates ou exporter de nouvelles données.</p>
              </CardContent>
          </Card>
      )}
    </main>
  );
}
