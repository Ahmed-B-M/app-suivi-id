
"use client";

import { useMemo } from "react";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import type { Tache, Tournee } from "@/lib/types";
import { useFilterContext } from "@/context/filter-context";
import { getHubCategory, getDepotFromHub } from "@/lib/grouping";
import { DetailsTasksTable } from "@/components/app/details-tasks-table";
import { DetailsRoundsTable } from "@/components/app/details-rounds-table";
import { DetailsBacsTable } from "@/components/app/details-bacs-table";

export default function DetailsPage() {
  const { firestore } = useFirebase();
  const { dateRange, filterType, selectedDepot, selectedStore } = useFilterContext();

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

  const filteredData = useMemo(() => {
    const { from, to } = dateRange || {};

    let filteredTasks = tasks || [];
    let filteredRounds = rounds || [];

    // Filter by date
    if (from) {
      const startOfDay = new Date(from);
      startOfDay.setHours(0,0,0,0);
      
      const endOfDay = to ? new Date(to) : new Date(from);
      endOfDay.setHours(23,59,59,999);
      
      const filterByDate = (item: Tache | Tournee) => {
        const itemDateString = item.date || item.dateCreation;
        if (!itemDateString) return false;
        const itemDate = new Date(itemDateString);
        return itemDate >= startOfDay && itemDate <= endOfDay;
      };

      filteredTasks = filteredTasks.filter(filterByDate);
      filteredRounds = filteredRounds.filter(filterByDate);
    }
    
    // Filter by type (depot/magasin)
    if (filterType !== 'tous') {
        const filterLogic = (item: Tache | Tournee) => getHubCategory(item.nomHub) === filterType;
        filteredTasks = filteredTasks.filter(filterLogic);
        filteredRounds = filteredRounds.filter(filterLogic);
    }

    // Filter by specific depot
    if (selectedDepot !== "all") {
      const filterLogic = (item: Tache | Tournee) => getDepotFromHub(item.nomHub) === selectedDepot;
      filteredTasks = filteredTasks.filter(filterLogic);
      filteredRounds = filteredRounds.filter(filterLogic);
    }
    
    // Filter by specific store
    if (selectedStore !== "all") {
      const filterLogic = (item: Tache | Tournee) => item.nomHub === selectedStore;
      filteredTasks = filteredTasks.filter(filterLogic);
      filteredRounds = filteredRounds.filter(filterLogic);
    }

    return { tasks: filteredTasks, rounds: filteredRounds };
  }, [tasks, rounds, dateRange, filterType, selectedDepot, selectedStore]);


  const isLoading = isLoadingTasks || isLoadingRounds;
  const error = tasksError || roundsError;

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
              <TabsTrigger value="tasks">Tâches ({filteredData.tasks.length})</TabsTrigger>
              <TabsTrigger value="rounds">Tournées ({filteredData.rounds.length})</TabsTrigger>
              <TabsTrigger value="bacs">Bacs & Articles</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="mt-4">
               <DetailsTasksTable data={filteredData.tasks} />
            </TabsContent>

            <TabsContent value="rounds" className="mt-4">
                <DetailsRoundsTable data={filteredData.rounds} />
            </TabsContent>

             <TabsContent value="bacs" className="mt-4">
                <DetailsBacsTable data={filteredData.tasks} />
            </TabsContent>
        </Tabs>
      )}

    </main>
  );
}
