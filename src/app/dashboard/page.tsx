
"use client";

import { useMemo, useState } from "react";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { DashboardStats } from "@/components/app/dashboard-stats";
import { TasksByStatusChart } from "@/components/app/tasks-by-status-chart";
import { TasksOverTimeChart } from "@/components/app/tasks-over-time-chart";
import { RoundsByStatusChart } from "@/components/app/rounds-by-status-chart";
import { RoundsOverTimeChart } from "@/components/app/rounds-over-time-chart";
import type { Tache, Round } from "@/lib/types";
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
import { RatingDetailsDialog } from "@/components/app/rating-details-dialog";

export default function DashboardPage() {
  const { firestore } = useFirebase();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [isRatingDetailsOpen, setIsRatingDetailsOpen] = useState(false);

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
  } = useCollection<Tache>(tasksCollection);

  const {
    data: rounds,
    isLoading: isLoadingRounds,
    error: roundsError,
  } = useCollection<Round>(roundsCollection);

  const filteredData = useMemo(() => {
    const { from, to } = dateRange || {};

    const filterByDate = (item: Tache | Round) => {
      if (!from || !to) return true;
      const itemDateString = item.date || item.dateCreation;
      if (!itemDateString) return false;
      
      const itemDate = new Date(itemDateString);
      // Set hours to 0 to compare dates only
      from.setHours(0,0,0,0);
      to.setHours(23,59,59,999);

      return itemDate >= from && itemDate <= to;
    };

    const filteredTasks = tasks?.filter(filterByDate) || [];
    const filteredRounds = rounds?.filter(filterByDate) || [];

    return { tasks: filteredTasks, rounds: filteredRounds };
  }, [tasks, rounds, dateRange]);

  const dashboardData = useMemo(() => {
    if (!filteredData.tasks && !filteredData.rounds) return null;

    const ratedTasks = filteredData.tasks.map(t => {
      const rating = t.metaDonnees?.notationLivreur;
      return typeof rating === 'number' ? rating : null;
    }).filter((r): r is number => r !== null);
    
    const averageRating =
      ratedTasks.length > 0
        ? ratedTasks.reduce((sum, rating) => sum + rating, 0) /
          ratedTasks.length
        : null;

    const taskStats = filteredData.tasks
      ? {
          totalTasks: filteredData.tasks.length,
          completedTasks: filteredData.tasks.filter(
            (t) => t.progression === "COMPLETED"
          ).length,
          unplannedTasks: filteredData.tasks.filter((t) => t.nonPlanifie).length,
          averageRating: averageRating,
        }
      : { totalTasks: 0, completedTasks: 0, unplannedTasks: 0, averageRating: null };

    const roundStats = filteredData.rounds
      ? {
          totalRounds: filteredData.rounds.length,
           completedRounds: filteredData.rounds.filter(
            (r) => r.status === "COMPLETED"
          ).length,
        }
      : { totalRounds: 0, completedRounds: 0 };

    const tasksByStatus = filteredData.tasks
      ? filteredData.tasks.reduce((acc, task) => {
          const status = task.progression || "Unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {};

    const tasksOverTime = filteredData.tasks
      ? filteredData.tasks.reduce((acc, task) => {
          const date = task.date ? task.date.split("T")[0] : "Non planifiée";
          if (date === "Non planifiée" && !task.nonPlanifie) return acc;
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {};

    const roundsByStatus = filteredData.rounds
      ? filteredData.rounds.reduce((acc, round) => {
          const status = round.status || "Unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {};

    const roundsOverTime = filteredData.rounds
      ? filteredData.rounds.reduce((acc, round) => {
          const date = round.date ? round.date.split("T")[0] : "Unknown";
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
      roundsByStatus: Object.entries(roundsByStatus).map(([name, value]) => ({
        name,
        value,
      })),
      roundsOverTime: Object.entries(roundsOverTime)
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
      <RatingDetailsDialog
        isOpen={isRatingDetailsOpen}
        onOpenChange={setIsRatingDetailsOpen}
        tasks={filteredData.tasks}
      />
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
          <Skeleton className="h-28 w-full" />
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
        <div className="space-y-6">
          <DashboardStats stats={dashboardData.stats} onRatingClick={() => setIsRatingDetailsOpen(true)}/>
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tasks">Analyse des Tâches</TabsTrigger>
              <TabsTrigger value="rounds">Analyse des Tournées</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="mt-4">
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
            </TabsContent>
            <TabsContent value="rounds" className="mt-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dashboardData.roundsByStatus.length > 0 ? (
                  <RoundsByStatusChart data={dashboardData.roundsByStatus} />
                ) : (
                   <Card className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Aucune donnée de tournée par statut pour cette période.</p>
                  </Card>
                )}
                 {dashboardData.roundsOverTime.length > 0 ? (
                  <RoundsOverTimeChart data={dashboardData.roundsOverTime} />
                ) : (
                  <Card className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Aucune donnée de tournée par jour pour cette période.</p>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
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
