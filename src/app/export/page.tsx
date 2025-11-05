
"use client";

import { useState } from "react";
import { UnifiedExportForm } from "@/app/unified-export-form";
import { Scheduler } from "@/components/app/scheduler";
import { LogDisplay } from "@/components/app/log-display";
import { TasksTable } from "@/components/app/tasks-table";
import { RoundsTable } from "@/components/app/rounds-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSearch } from "lucide-react";
import type { Tache, Tournee } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ExportPage() {
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

  return (
    <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold mb-8">Export de Données Urbantz</h1>
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

                {(taskJsonData || roundJsonData) && (
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
    </main>
  );
}
