"use client";

import { useState } from "react";
import { AppHeader } from "@/components/app/header";
import { ExportForm } from "@/components/app/export-form";
import { Scheduler } from "@/components/app/scheduler";
import { LogDisplay } from "@/components/app/log-display";

export default function Home() {
  const [logs, setLogs] = useState<string[]>([]);
  const [jsonData, setJsonData] = useState<any[] | null>(null);

  const handleExportComplete = (newLogs: string[], data: any[] | null) => {
    setLogs(newLogs);
    if (data) {
      setJsonData(data);
    }
  };

  const handleReset = () => {
    setLogs([]);
    setJsonData(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-1 container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3 flex flex-col gap-8">
            <ExportForm
              onExportComplete={handleExportComplete}
              onReset={handleReset}
              jsonData={jsonData}
            />
            <LogDisplay logs={logs} />
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
