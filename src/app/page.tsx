"use client";

import { useMemo, useState } from "react";
import { ExportForm } from "@/components/app/export-form";
import { Scheduler } from "@/components/app/scheduler";
import { LogDisplay } from "@/components/app/log-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoundExportForm } from "@/components/app/round-export-form";
import { TasksTable } from "@/components/app/tasks-table";
import { RoundsTable } from "@/components/app/rounds-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSearch } from "lucide-react";
import { DashboardStats } from "@/components/app/dashboard-stats";
import { TasksByStatusChart } from "@/components/app/tasks-by-status-chart";
import { TasksOverTimeChart } from "@/components/app/tasks-over-time-chart";
import type { Task, Round } from "@/lib/types";

export default function Home() {
  const [taskLogs, setTaskLogs] = useState<string[]>([]);
  const [taskJsonData, setTaskJsonData] = useState<Task[] | null>(null);

  const [roundLogs, setRoundLogs] = useState<string[]>([]);
  const [roundJsonData, setRoundJsonData] = useState<Round[] | null>(null);

  const handleTaskExportComplete = (newLogs: string[], data: any[] | null) => {
    setTaskLogs(prev => [...prev, ...newLogs]);
    if (data) {
      setTaskJsonData(data as Task[]);
    }
  };

  const handleTaskReset = () => {
    setTaskLogs([]);
    setTaskJsonData(null);
  };

  const handleRoundExportComplete = (newLogs: string[], data: any[] | null) => {
    setRoundLogs(prev => [...prev, ...newLogs]);
    if (data) {
      setRoundJsonData(data as Round[]);
    }
  };

  const handleRoundReset = () => {
    setRoundLogs([]);
    setRoundJsonData(null);
  };
  
  const dashboardData = useMemo(() => {
    if (!taskJsonData && !roundJsonData) return null;

    const taskStats = taskJsonData
      ? {
          totalTasks: taskJsonData.length,
          completedTasks: taskJsonData.filter(
            (t) => t.progress === "COMPLETED"
          ).length,
          unplannedTasks: taskJsonData.filter((t) => t.unplanned).length,
        }
      : { totalTasks: 0, completedTasks: 0, unplannedTasks: 0 };

    const roundStats = roundJsonData
      ? {
          totalRounds: roundJsonData.length,
        }
      : { totalRounds: 0 };

    const tasksByStatus = taskJsonData
      ? taskJsonData.reduce((acc, task) => {
          const status = task.progress || "Unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {};

    const tasksOverTime = taskJsonData
      ? taskJsonData.reduce((acc, task) => {
          const date = task.date ? task.date.split("T")[0] : 'Unplanned';
          if(date === 'Unplanned' && !task.unplanned) return acc;
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {};


    return {
      stats: { ...taskStats, ...roundStats },
      tasksByStatus: Object.entries(tasksByStatus).map(([name, value]) => ({
        name,
        value,
      })),
      tasksOverTime: Object.entries(tasksOverTime).map(([date, count]) => ({
        date,
        count,
      })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    };
  }, [taskJsonData, roundJsonData]);

  return (
    <main className="flex-1 container py-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-3 flex flex-col gap-8">
          <Tabs defaultValue="tasks">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tasks">Tâches</TabsTrigger>
              <TabsTrigger value="rounds">Tournées</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="mt-4 space-y-8">
              <ExportForm
                onExportComplete={handleTaskExportComplete}
                onReset={handleTaskReset}
                jsonData={taskJsonData}
              />
            </TabsContent>
            <TabsContent value="rounds" className="mt-4 space-y-8">
              <RoundExportForm
                onExportComplete={handleRoundExportComplete}
                onReset={handleRoundReset}
                jsonData={roundJsonData}
              />
            </TabsContent>
          </Tabs>

          {dashboardData && (
             <Card>
                <CardHeader>
                    <CardTitle>Tableau de Bord des Données Extraites</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <DashboardStats stats={dashboardData.stats} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {dashboardData.tasksByStatus.length > 0 && (
                        <TasksByStatusChart data={dashboardData.tasksByStatus} />
                      )}
                      {dashboardData.tasksOverTime.length > 0 && (
                        <TasksOverTimeChart data={dashboardData.tasksOverTime} />
                      )}
                    </div>
                </CardContent>
            </Card>
          )}

          {taskJsonData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSearch />
                  Données de Tâches Extraites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TasksTable data={taskJsonData} />
              </CardContent>
            </Card>
          )}

          {roundJsonData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSearch />
                  Données de Tournées Extraites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RoundsTable data={roundJsonData} />
              </CardContent>
            </Card>
          )}

          {taskLogs.length > 0 && <LogDisplay logs={taskLogs} />}
          {roundLogs.length > 0 && <LogDisplay logs={roundLogs} />}
          
        </div>
        <div className="lg:col-span-2">
          <Scheduler />
        </div>
      </div>
    </main>
  );
}
