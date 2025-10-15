"use client";

import { useState } from "react";
import { AppHeader } from "@/components/app/header";
import { ExportForm } from "@/components/app/export-form";
import { Scheduler } from "@/components/app/scheduler";
import { LogDisplay } from "@/components/app/log-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoundExportForm } from "@/components/app/round-export-form";

export default function Home() {
  const [taskLogs, setTaskLogs] = useState<string[]>([]);
  const [taskJsonData, setTaskJsonData] = useState<any[] | null>(null);

  const [roundLogs, setRoundLogs] = useState<string[]>([]);
  const [roundJsonData, setRoundJsonData] = useState<any[] | null>(null);

  const handleTaskExportComplete = (newLogs: string[], data: any[] | null) => {
    setTaskLogs(newLogs);
    if (data) {
      setTaskJsonData(data);
    }
  };

  const handleTaskReset = () => {
    setTaskLogs([]);
    setTaskJsonData(null);
  };

  const handleRoundExportComplete = (newLogs: string[], data: any[] | null) => {
    setRoundLogs(newLogs);
    if (data) {
      setRoundJsonData(data);
    }
  };

  const handleRoundReset = () => {
    setRoundLogs([]);
    setRoundJsonData(null);
  };


  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-1 container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3 flex flex-col gap-8">
            <Tabs defaultValue="tasks">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tasks">Exporter les Tâches</TabsTrigger>
                <TabsTrigger value="rounds">Exporter les Tournées</TabsTrigger>
              </TabsList>
              <TabsContent value="tasks" className="mt-4">
                 <ExportForm
                    onExportComplete={handleTaskExportComplete}
                    onReset={handleTaskReset}
                    jsonData={taskJsonData}
                  />
                  <LogDisplay logs={taskLogs} className="mt-8"/>
              </TabsContent>
              <TabsContent value="rounds" className="mt-4">
                  <RoundExportForm
                      onExportComplete={handleRoundExportComplete}
                      onReset={handleRoundReset}
                      jsonData={roundJsonData}
                    />
                  <LogDisplay logs={roundLogs} className="mt-8"/>
              </TabsContent>
            </Tabs>
          </div>
          <div className="lg:col-span-2">
            <Scheduler />
          </div>
        </div>
      </main>
      <footer className="py-6 border-t mt-8">
        <div className="container text-center text-sm text-muted-foreground">
          Urbantz Data Exporter
        </div>
      </footer>
    </div>
  );
}
