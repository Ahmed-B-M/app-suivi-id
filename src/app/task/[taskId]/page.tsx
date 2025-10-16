
"use client";

import { useMemo } from "react";
import { doc } from "firebase/firestore";
import { useDoc, useMemoFirebase } from "@/firebase";
import { useFirebase } from "@/firebase/provider";
import { TaskDetails } from "@/components/app/task-details";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task } from "@/lib/types";
import { AlertCircle } from "lucide-react";

export default function TaskPage({ params }: { params: { taskId: string } }) {
  const { firestore } = useFirebase();

  const taskRef = useMemoFirebase(
    () => (firestore && params.taskId ? doc(firestore, "tasks", params.taskId) : null),
    [firestore, params.taskId]
  );

  const {
    data: task,
    isLoading,
    error,
  } = useDoc<Task>(taskRef);

  return (
    <main className="flex-1 container py-8">
      {isLoading && (
         <Card>
            <CardHeader>
                <Skeleton className="h-8 w-2/3" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-96 w-full" />
            </CardContent>
         </Card>
      )}

      {error && (
         <Card className="bg-destructive/10 border-destructive">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle />
                    Erreur de chargement de la tâche
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p>Impossible de charger les données de la tâche depuis Firestore.</p>
                <pre className="mt-4 text-sm bg-background p-2 rounded">{error.message}</pre>
            </CardContent>
         </Card>
      )}

      {task && (
         <Card>
            <CardHeader>
              <CardTitle>Détails de la Tâche: {task.taskId}</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskDetails taskData={task} />
            </CardContent>
         </Card>
      )}

       {!isLoading && !task && !error && (
         <Card>
            <CardHeader>
                <CardTitle>Tâche non trouvée</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Aucune tâche trouvée avec l'ID : {params.taskId}</p>
            </CardContent>
         </Card>
      )}
    </main>
  );
}
