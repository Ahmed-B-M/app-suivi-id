
"use client";

import { useState, useMemo } from "react";
import { UnifiedExportForm } from "@/components/app/unified-export-form";
import { Scheduler } from "@/components/app/scheduler";
import { LogDisplay } from "@/components/app/log-display";
import { TasksTable } from "@/components/app/tasks-table";
import { RoundsTable } from "@/components/app/rounds-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSearch } from "lucide-react";
import type { Tache, Tournee } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion } from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


function ExportTab() {
  const [logs, setLogs] = useState<string[]>([]);
  const [taskJsonData, setTaskJsonData] = useState<Tache[] | null>(null);
  const [roundJsonData, setRoundJsonData] = useState<Tournee[] | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleExportStart = () => {
    setLogs([]);
    setTaskJsonData(null);
    setRoundJsonData(null);
    setIsExporting(true);
  };

  const handleExportComplete = (
    newLogs: string[],
    data: { tasks: Tache[]; rounds: Tournee[] } | null
  ) => {
    setLogs((prev) => [...prev, ...newLogs]);
    if (data) {
      setTaskJsonData(data.tasks);
      setRoundJsonData(data.rounds);
    }
    setIsExporting(false);
  };

  const handleLogUpdate = (newLogs: string[]) => {
    setLogs((prev) => [...prev, ...newLogs]);
  };

  const handleSavingChange = (saving: boolean) => {
    setIsSaving(saving);
  };

  const handleReset = () => {
    setLogs([]);
    setTaskJsonData(null);
    setRoundJsonData(null);
  };

  const showResults =
    (taskJsonData && taskJsonData.length > 0) ||
    (roundJsonData && roundJsonData.length > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
      <div className="lg:col-span-3 flex flex-col gap-8">
        <UnifiedExportForm
          onExportStart={handleExportStart}
          onExportComplete={handleExportComplete}
          onReset={handleReset}
          onLogUpdate={handleLogUpdate}
          onSavingChange={handleSavingChange}
          taskJsonData={taskJsonData}
          roundJsonData={roundJsonData}
          isExporting={isExporting}
          isSaving={isSaving}
        />

        {showResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch />
                Données Extraites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tasks">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tasks">
                    Tâches ({taskJsonData?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="rounds">
                    Tournées ({roundJsonData?.length || 0})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="tasks" className="mt-4">
                  {taskJsonData && taskJsonData.length > 0 ? (
                    <TasksTable data={taskJsonData} />
                  ) : (
                    <p className="text-muted-foreground text-center p-4">
                      Aucune tâche extraite.
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="rounds" className="mt-4">
                  {roundJsonData && roundJsonData.length > 0 ? (
                    <RoundsTable data={roundJsonData} />
                  ) : (
                    <p className="text-muted-foreground text-center p-4">
                      Aucune tournée extraite.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {logs.length > 0 && <LogDisplay logs={logs} />}
      </div>
      <div className="lg:col-span-2">
        <Scheduler />
      </div>
    </div>
  );
}

function DatabaseTab() {
  const { firestore } = useFirebase();

  // No specific client-side filtering needed here, we show all data in groups.
  // Order by date to have a consistent display.
  const tasksCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "tasks"), orderBy("date", "desc"));
  }, [firestore]);

  const roundsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "rounds"), orderBy("date", "desc"));
  }, [firestore]);

  const { data: tasks, loading: isLoadingTasks, error: tasksError } = useCollection<Tache>(tasksCollection);
  const { data: rounds, loading: isLoadingRounds, error: roundsError } = useCollection<Tournee>(roundsCollection);

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
    return Object.keys(roundsByDate).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [roundsByDate]);
  
  const isLoading = isLoadingTasks || isLoadingRounds;

  return (
    <Tabs defaultValue="tasks" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="tasks">
          Tâches ({isLoading ? '...' : tasks?.length || 0})
        </TabsTrigger>
        <TabsTrigger value="rounds">
          Tournées ({isLoading ? '...' : rounds?.length || 0})
        </TabsTrigger>
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
            {isLoadingTasks && (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
            )}
            {tasksError && (
              <p className="text-destructive">Erreur: {tasksError.message}</p>
            )}
            {!isLoadingTasks && tasks && Object.keys(tasksByStatus).length > 0 ? (
               <Accordion type="multiple" className="w-full">
                {Object.entries(tasksByStatus).map(
                  ([status, tasksInStatus]) => (
                     <AccordionItem value={status} key={status}>
                        <AccordionTrigger>
                           <div className="flex items-center gap-4 justify-between w-full pr-4">
                              <span className="text-lg capitalize">{status.toLowerCase()}</span>
                              <p className="text-sm text-muted-foreground">{tasksInStatus.length} tâches</p>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <TasksTable data={tasksInStatus} />
                        </AccordionContent>
                     </AccordionItem>
                  )
                )}
              </Accordion>
            ) : (
              !isLoadingTasks && (
                <p className="text-muted-foreground p-4 text-center">
                  Aucune tâche trouvée dans la base de données.
                </p>
              )
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
            {isLoadingRounds && (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            )}
            {roundsError && (
              <p className="text-destructive">Erreur: {roundsError.message}</p>
            )}
            {!isLoadingRounds && rounds && sortedRoundDates.length > 0 ? (
              <Accordion type="multiple" className="w-full">
                {sortedRoundDates.map((date) => (
                  <AccordionItem value={date} key={date}>
                     <AccordionTrigger>
                        <div className="flex items-center gap-4 justify-between w-full pr-4">
                           <span className="text-lg">{date}</span>
                           <p className="text-sm text-muted-foreground">{roundsByDate[date].length} tournées</p>
                        </div>
                     </AccordionTrigger>
                     <AccordionContent>
                        <RoundsTable data={roundsByDate[date]} />
                     </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              !isLoadingRounds && (
                <p className="text-muted-foreground p-4 text-center">
                  Aucune tournée trouvée dans la base de données.
                </p>
              )
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export default function SettingsPage() {
  return (
    <main className="flex-1 container py-8">
      <h1 className="text-3xl font-bold mb-8">Paramètres</h1>
      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">Configuration de l'Export</TabsTrigger>
          <TabsTrigger value="database">Base de Données</TabsTrigger>
        </TabsList>
        <TabsContent value="export" className="mt-4">
          <ExportTab />
        </TabsContent>
        <TabsContent value="database" className="mt-4">
          <DatabaseTab />
        </TabsContent>
      </Tabs>
    </main>
  );
}

    