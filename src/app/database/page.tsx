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
  } = useCollection(tasksCollection);

  const {
    data: rounds,
    isLoading: isLoadingRounds,
    error: roundsError,
  } = useCollection(roundsCollection);

  return (
    <main className="flex-1 container py-8">
      <h1 className="text-3xl font-bold mb-8">Base de Données Firestore</h1>
      <Tabs defaultValue="tasks">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tasks">Tâches</TabsTrigger>
          <TabsTrigger value="rounds">Tournées</TabsTrigger>
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
              {tasks && <TasksTable data={tasks} />}
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
              {rounds && <RoundsTable data={rounds} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
