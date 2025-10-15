"use client";

import { useMemo } from "react";
import { useCollection } from "@/firebase";
import { collection } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { TasksTable } from "@/components/app/tasks-table";
import { RoundsTable } from "@/components/app/rounds-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { HubsTable } from "@/components/app/hubs-table";
import { CustomersTable } from "@/components/app/customers-table";

export default function DatabasePage() {
  const { firestore } = useFirebase();

  const tasksCollection = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, "tasks");
  }, [firestore]);

  const roundsCollection = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, "rounds");
  }, [firestore]);

  const hubsCollection = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, "hubs");
  }, [firestore]);

  const customersCollection = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, "customers");
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

  const {
    data: hubs,
    isLoading: isLoadingHubs,
    error: hubsError,
  } = useCollection(hubsCollection);

  const {
    data: customers,
    isLoading: isLoadingCustomers,
    error: customersError,
  } = useCollection(customersCollection);


  return (
    <main className="flex-1 container py-8">
      <h1 className="text-3xl font-bold mb-8">Données Sauvegardées</h1>
      <Tabs defaultValue="tasks">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks">Tâches</TabsTrigger>
          <TabsTrigger value="rounds">Tournées</TabsTrigger>
          <TabsTrigger value="hubs">Hubs</TabsTrigger>
          <TabsTrigger value="customers">Clients</TabsTrigger>
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
        <TabsContent value="hubs" className="mt-4">
           {isLoadingHubs && <Skeleton className="h-64 w-full" />}
          {hubsError && <p className="text-destructive">Erreur: {hubsError.message}</p>}
          {hubs && <HubsTable data={hubs} />}
        </TabsContent>
        <TabsContent value="customers" className="mt-4">
           {isLoadingCustomers && <Skeleton className="h-64 w-full" />}
          {customersError && <p className="text-destructive">Erreur: {customersError.message}</p>}
          {customers && <CustomersTable data={customers} />}
        </TabsContent>
      </Tabs>
    </main>
  );
}
