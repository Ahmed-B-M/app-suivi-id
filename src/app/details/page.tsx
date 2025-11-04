"use client";

import { useMemo } from "react";
import { useQuery, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import type { Tache, Tournee } from "@/lib/types";
import { useFilters } from "@/context/filter-context";
import { getHubCategory, getDepotFromHub } from "@/lib/grouping";
import { DetailsTasksTable } from "@/components/app/details-tasks-table";
import { DetailsRoundsTable } from "@/components/app/details-rounds-table";
import { DetailsBacsTable } from "@/components/app/details-bacs-table";

export default function DetailsPage() {
  const { allTasks: filteredTasks, allRounds: filteredRounds, isContextLoading } = useFilters();

  const isLoading = isContextLoading;
  const error = null; // Assuming no errors from context

  return (
    <main className="flex-1 container py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Données Détaillées</h1>
      </div>

       {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-96 w-full" />
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
              Impossible de charger les données depuis Firestore.
            </p>
            <pre className="mt-4 text-sm bg-background p-2 rounded">
              {error.message}
            </pre>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tasks">Tâches ({filteredTasks.length})</TabsTrigger>
              <TabsTrigger value="rounds">Tournées ({filteredRounds.length})</TabsTrigger>
              <TabsTrigger value="bacs">Bacs & Articles</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="mt-4">
               <DetailsTasksTable data={filteredTasks} />
            </TabsContent>

            <TabsContent value="rounds" className="mt-4">
                <DetailsRoundsTable data={filteredRounds} />
            </TabsContent>

             <TabsContent value="bacs" className="mt-4">
                <DetailsBacsTable data={filteredTasks} />
            </TabsContent>
        </Tabs>
      )}

    </main>
  );
}
