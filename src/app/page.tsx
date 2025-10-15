"use client";

import { useState } from "react";
import { ExportForm } from "@/components/app/export-form";
import { Scheduler } from "@/components/app/scheduler";
import { LogDisplay } from "@/components/app/log-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoundExportForm } from "@/components/app/round-export-form";
import { TasksTable } from "@/components/app/tasks-table";
import { RoundsTable } from "@/components/app/rounds-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSearch } from "lucide-react";
import { HubExportForm } from "@/components/app/hub-export-form";
import { HubsTable } from "@/components/app/hubs-table";
import { CustomerExportForm } from "@/components/app/customer-export-form";
import { CustomersTable } from "@/components/app/customers-table";

export default function Home() {
  const [taskLogs, setTaskLogs] = useState<string[]>([]);
  const [taskJsonData, setTaskJsonData] = useState<any[] | null>(null);

  const [roundLogs, setRoundLogs] = useState<string[]>([]);
  const [roundJsonData, setRoundJsonData] = useState<any[] | null>(null);

  const [hubLogs, setHubLogs] = useState<string[]>([]);
  const [hubJsonData, setHubJsonData] = useState<any[] | null>(null);

  const [customerLogs, setCustomerLogs] = useState<string[]>([]);
  const [customerJsonData, setCustomerJsonData] = useState<any[] | null>(null);

  const handleTaskExportComplete = (newLogs: string[], data: any[] | null) => {
    setTaskLogs(prev => [...prev, ...newLogs]);
    if (data) {
      setTaskJsonData(data);
    }
  };

  const handleTaskReset = () => {
    setTaskLogs([]);
    setTaskJsonData(null);
  };

  const handleRoundExportComplete = (newLogs: string[], data: any[] | null) => {
    setRoundLogs(prev => [...prev, ...newLogs]);
    if (data) {
      setRoundJsonData(data);
    }
  };

  const handleRoundReset = () => {
    setRoundLogs([]);
    setRoundJsonData(null);
  };

  const handleHubExportComplete = (newLogs: string[], data: any[] | null) => {
    setHubLogs(prev => [...prev, ...newLogs]);
    if (data) {
      setHubJsonData(data);
    }
  };

  const handleHubReset = () => {
    setHubLogs([]);
    setHubJsonData(null);
  };

  const handleCustomerExportComplete = (newLogs: string[], data: any[] | null) => {
    setCustomerLogs(prev => [...prev, ...newLogs]);
    if (data) {
      setCustomerJsonData(data);
    }
  };

  const handleCustomerReset = () => {
    setCustomerLogs([]);
    setCustomerJsonData(null);
  };


  return (
      <main className="flex-1 container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3 flex flex-col gap-8">
            <Tabs defaultValue="tasks">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="tasks">Tâches</TabsTrigger>
                <TabsTrigger value="rounds">Tournées</TabsTrigger>
                <TabsTrigger value="hubs">Hubs</TabsTrigger>
                <TabsTrigger value="customers">Clients</TabsTrigger>
              </TabsList>
              <TabsContent value="tasks" className="mt-4 space-y-8">
                 <ExportForm
                    onExportComplete={handleTaskExportComplete}
                    onReset={handleTaskReset}
                    jsonData={taskJsonData}
                  />
                  {taskJsonData && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileSearch/>
                                Données de Tâches Extraites
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TasksTable data={taskJsonData} />
                        </CardContent>
                    </Card>
                  )}
                  <LogDisplay logs={taskLogs} />
              </TabsContent>
              <TabsContent value="rounds" className="mt-4 space-y-8">
                  <RoundExportForm
                      onExportComplete={handleRoundExportComplete}
                      onReset={handleRoundReset}
                      jsonData={roundJsonData}
                    />
                    {roundJsonData && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileSearch/>
                                    Données de Tournées Extraites
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RoundsTable data={roundJsonData} />
                            </CardContent>
                        </Card>
                    )}
                  <LogDisplay logs={roundLogs} />
              </TabsContent>
               <TabsContent value="hubs" className="mt-4 space-y-8">
                  <HubExportForm
                      onExportComplete={handleHubExportComplete}
                      onReset={handleHubReset}
                      jsonData={hubJsonData}
                    />
                    {hubJsonData && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileSearch/>
                                    Données de Hubs Extraites
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <HubsTable data={hubJsonData} />
                            </CardContent>
                        </Card>
                    )}
                  <LogDisplay logs={hubLogs} />
              </TabsContent>
              <TabsContent value="customers" className="mt-4 space-y-8">
                  <CustomerExportForm
                      onExportComplete={handleCustomerExportComplete}
                      onReset={handleCustomerReset}
                      jsonData={customerJsonData}
                    />
                    {customerJsonData && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileSearch/>
                                    Données de Clients Extraites
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CustomersTable data={customerJsonData} />
                            </CardContent>
                        </Card>
                    )}
                  <LogDisplay logs={customerLogs} />
              </TabsContent>
            </Tabs>
          </div>
          <div className="lg:col-span-2">
            <Scheduler />
          </div>
        </div>
      </main>
  );
}
