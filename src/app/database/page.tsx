"use client";

import { useMemo } from "react";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { TasksTable } from "@/components/app/tasks-table";
import { RoundsTable } from "@/components/app/rounds-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileSearch } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import type { Tache, Tournee } from "@/lib/types";

export default function DatabasePage() {
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
  } = useCollection<Tache>(tasksCollection);

  const {
    data: rounds,
    isLoading: isLoadingRounds,
    error: roundsError,
  } = useCollection<Tournee>(roundsCollection);

  const tasksByStatus = useMemo(() => {
    if (!tasks) return {};
    return tasks.reduce((acc, task) => {
      const status = task.progression || "Unknown";
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(task);
      return acc;
    }, {} as Record<string, Tache[]>);
  }, [tasks]);

  const roundsByDate = useMemo(() => {
    if (!rounds) return {};
    return rounds.reduce((acc, round) => {
      const date = round.date ? round.date.split("T")[0] : "Sans date";
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(round);
      return acc;
    }, {} as Record<string, Tournee[]>);
  }, [rounds]);

  const sortedRoundDates = useMemo(() => {
    return Object.keys(roundsByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [roundsByDate]);

  return (
    <main className="flex-1 container py-8">
      <h1 className="text-3xl font-bold mb-8">Base de Données Firestore</h1>
      <Tabs defaultValue="tasks">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tasks">Tâches ({tasks?.length || 0})</TabsTrigger>
          <TabsTrigger value="rounds">Tournées ({rounds?.length || 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch />
                Données de Tâches Sauvegardées
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTasks && <Skeleton className="h-64 w-full" />}
              {tasksError && (
                <p className="text-destructive">Erreur: {tasksError.message}</p>
              )}
              {tasks && Object.keys(tasksByStatus).length > 0 ? (
                 <Accordion type="multiple" className="w-full space-y-4">
                  {Object.entries(tasksByStatus).map(([status, tasksInStatus]) => (
                    <Card key={status}>
                      <CardHeader>
                        <CardTitle className="text-lg capitalize">
                          {status.toLowerCase()} ({tasksInStatus.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <TasksTable data={tasksInStatus} />
                      </CardContent>
                    </Card>
                  ))}
                </Accordion>
              ) : (
                !isLoadingTasks && <p className="text-muted-foreground p-4 text-center">Aucune tâche trouvée dans la base de données.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="rounds" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch />
                Données de Tournées Sauvegardées
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRounds && <Skeleton className="h-64 w-full" />}
              {roundsError && (
                <p className="text-destructive">
                  Erreur: {roundsError.message}
                </p>
              )}
              {rounds && sortedRoundDates.length > 0 ? (
                 <Accordion type="multiple" className="w-full space-y-4">
                  {sortedRoundDates.map((date) => (
                    <Card key={date}>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {date} ({roundsByDate[date].length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <RoundsTable data={roundsByDate[date]} />
                      </CardContent>
                    </Card>
                  ))}
                </Accordion>
              ) : (
                !isLoadingRounds && <p className="text-muted-foreground p-4 text-center">Aucune tournée trouvée dans la base de données.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
