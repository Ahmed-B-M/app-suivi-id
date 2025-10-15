"use client";

import { useCollection } from "@/firebase";
import { collection, getFirestore } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { TasksTable } from "@/components/app/tasks-table";
import { RoundsTable } from "@/components/app/rounds-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function DatabasePage() {
  const { firestore } = useFirebase();

  const {
    data: tasks,
    isLoading: isLoadingTasks,
    error: tasksError,
  } = useCollection(collection(firestore, "tasks"));

  const {
    data: rounds,
    isLoading: isLoadingRounds,
    error: roundsError,
  } = useCollection(collection(firestore, "rounds"));

  return (
    <main className="flex-1 container py-8">
      <h1 className="text-3xl font-bold mb-8">Données Sauvegardées</h1>
      <Tabs defaultValue="tasks">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tasks">Tâches</TabsTrigger>
          <TabsTrigger value="rounds">Tournées</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-4">
          {isLoadingTasks && <Skeleton className="h-64 w-full" />}
          {tasksError && <p className="text-destructive">Erreur: {tasksError.message}</p>}
          {tasks && <TasksTable data={tasks} />}
        </TabsContent>
        <TabsContent value="rounds" className="mt-4">
           {isLoadingRounds && <Skeleton className="h-64 w-full" />}
          {roundsError && <p className="text-destructive">Erreur: {roundsError.message}</p>}
          {rounds && <RoundsTable data={rounds} />}
        </TabsContent>
      </Tabs>
    </main>
  );
}