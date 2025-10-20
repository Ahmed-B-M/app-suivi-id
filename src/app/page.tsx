
"use client";

import { useMemo, useState } from "react";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { DashboardStats } from "@/components/app/dashboard-stats";
import { TasksByStatusChart } from "@/components/app/tasks-by-status-chart";
import { TasksByProgressionChart } from "@/components/app/tasks-by-progression-chart";
import { TasksOverTimeChart } from "@/components/app/tasks-over-time-chart";
import { RoundsByStatusChart } from "@/components/app/rounds-by-status-chart";
import { RoundsOverTimeChart } from "@/components/app/rounds-over-time-chart";
import type { Tache, Tournee } from "@/lib/types";
import { RatingDetailsDialog } from "@/components/app/rating-details-dialog";
import { calculateDriverScore, calculateRawDriverStats, type DriverStats } from "@/lib/scoring";
import { PunctualityDetailsDialog, PunctualityTask } from "@/components/app/punctuality-details-dialog";
import { StatusDetailsDialog } from "@/components/app/status-details-dialog";
import { FailedDeliveryDetailsDialog } from "@/components/app/failed-delivery-details-dialog";
import { MissingBacsDetailsDialog } from "@/components/app/missing-bacs-details-dialog";
import { RedeliveryDetailsDialog } from "@/components/app/redelivery-details-dialog";
import { SensitiveDeliveriesDialog } from "@/components/app/sensitive-deliveries-dialog";
import { QualityAlertDialog } from "@/components/app/quality-alert-dialog";
import { AllRoundsDetailsDialog } from "@/components/app/all-rounds-details-dialog";
import { useFilters } from "@/context/filter-context";
import { DriverPerformanceTable } from "@/components/app/driver-performance-table";
import { addMinutes, differenceInMinutes, subMinutes } from "date-fns";
import { getDriverFullName, getHubCategory, getDepotFromHub } from "@/lib/grouping";
import { calculateDashboardStats } from "@/lib/stats-calculator";


export default function DashboardPage() {
  const { firestore } = useFirebase();
  const { 
    dateRange, 
    filterType,
    selectedDepot, 
    selectedStore,
    allTasks,
    allRounds,
    isContextLoading,
   } = useFilters();

  const [isRatingDetailsOpen, setIsRatingDetailsOpen] = useState(false);
  const [isFailedDeliveryDetailsOpen, setIsFailedDeliveryDetailsOpen] = useState(false);
  const [isMissingBacsDetailsOpen, setIsMissingBacsDetailsOpen] = useState(false);
  const [isRedeliveryDetailsOpen, setIsRedeliveryDetailsOpen] = useState(false);
  const [isSensitiveDeliveriesOpen, setIsSensitiveDeliveriesOpen] = useState(false);
  const [isQualityAlertOpen, setIsQualityAlertOpen] = useState(false);
  const [isAllRoundsDetailsOpen, setIsAllRoundsDetailsOpen] = useState(false);
  const [punctualityDetails, setPunctualityDetails] = useState<{
    type: 'early' | 'late' | 'late_over_1h';
    tasks: PunctualityTask[];
  } | null>(null);
  const [statusDetails, setStatusDetails] = useState<{ status: string; tasks: Tache[], type: 'status' | 'progression' } | null>(null);

  const filteredData = useMemo(() => {
    const { from, to } = dateRange || {};

    let filteredTasks = allTasks || [];
    let filteredRounds = allRounds || [];

    // Filter by date
    if (from) {
      const startOfDay = new Date(from);
      startOfDay.setHours(0,0,0,0);
      
      const endOfDay = to ? new Date(to) : new Date(from);
      endOfDay.setHours(23,59,59,999);
      
      const filterByDate = (item: Tache | Tournee) => {
        const itemDateString = item.date || ('dateCreation' in item && item.dateCreation);
        if (!itemDateString) return false;
        try {
            const itemDate = new Date(itemDateString);
            return itemDate >= startOfDay && itemDate <= endOfDay;
        } catch (e) {
            return false;
        }
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
  }, [allTasks, allRounds, dateRange, filterType, selectedDepot, selectedStore]);

  const handleStatusClick = (status: string) => {
      const tasksForStatus = filteredData.tasks.filter(task => {
        if (status === 'Unknown') {
          return !task.status || task.status === 'Unknown';
        }
        return (task.status || "Unknown") === status;
      });
      setStatusDetails({ status, tasks: tasksForStatus, type: 'status' });
    };

  const handleProgressionClick = (progression: string) => {
    const tasksForProgression = filteredData.tasks.filter(task => (task.progression || "Unknown") === progression);
    setStatusDetails({ status: progression, tasks: tasksForProgression, type: 'progression' });
  };


  const dashboardData = useMemo(() => {
    return calculateDashboardStats(filteredData.tasks, filteredData.rounds);
  }, [filteredData.tasks, filteredData.rounds]);

  const isLoading = isContextLoading;
  const error = null; // Assuming no error state from context for now

  return (
    <main className="flex-1 container py-8">
      <RatingDetailsDialog
        isOpen={isRatingDetailsOpen}
        onOpenChange={setIsRatingDetailsOpen}
        tasks={filteredData.tasks}
      />
      <PunctualityDetailsDialog
        isOpen={!!punctualityDetails}
        onOpenChange={() => setPunctualityDetails(null)}
        details={punctualityDetails}
      />
       <StatusDetailsDialog
        isOpen={!!statusDetails}
        onOpenChange={() => setStatusDetails(null)}
        details={statusDetails}
      />
       <FailedDeliveryDetailsDialog
        isOpen={isFailedDeliveryDetailsOpen}
        onOpenChange={setIsFailedDeliveryDetailsOpen}
        tasks={dashboardData?.failedTasksList || []}
      />
      <MissingBacsDetailsDialog
        isOpen={isMissingBacsDetailsOpen}
        onOpenChange={setIsMissingBacsDetailsOpen}
        tasks={dashboardData?.tasksWithMissingBacs || []}
      />
      <RedeliveryDetailsDialog
        isOpen={isRedeliveryDetailsOpen}
        onOpenChange={setIsRedeliveryDetailsOpen}
        tasks={dashboardData?.redeliveriesList || []}
      />
      <SensitiveDeliveriesDialog
        isOpen={isSensitiveDeliveriesOpen}
        onOpenChange={setIsSensitiveDeliveriesOpen}
        tasks={dashboardData?.sensitiveDeliveriesList || []}
      />
      <QualityAlertDialog
        isOpen={isQualityAlertOpen}
        onOpenChange={setIsQualityAlertOpen}
        tasks={dashboardData?.qualityAlertTasks || []}
      />
      <AllRoundsDetailsDialog
        isOpen={isAllRoundsDetailsOpen}
        onOpenChange={setIsAllRoundsDetailsOpen}
        rounds={filteredData.rounds}
      />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Tableau de Bord</h1>
      </div>

      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
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
              Impossible de charger les données depuis Firestore. Veuillez vérifier vos
              permissions et la configuration de votre projet.
            </p>
            <pre className="mt-4 text-sm bg-background p-2 rounded">
              {error.message}
            </pre>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && dashboardData && dashboardData.hasData && (
        <div className="space-y-6">
          <DashboardStats 
            stats={dashboardData.stats!}
            topDrivers={dashboardData.top5StarDrivers || []}
            onRatingClick={() => setIsRatingDetailsOpen(true)}
            onEarlyClick={() => setPunctualityDetails({ type: 'early', tasks: dashboardData.earlyTasks || [] })}
            onLateClick={() => setPunctualityDetails({ type: 'late', tasks: dashboardData.lateTasks || [] })}
            onLateOver1hClick={() => setPunctualityDetails({ type: 'late_over_1h', tasks: dashboardData.lateTasksOver1h || [] })}
            onFailedDeliveryClick={() => setIsFailedDeliveryDetailsOpen(true)}
            onPendingClick={() => setStatusDetails({ status: 'PENDING', tasks: dashboardData.pendingTasksList || [], type: 'status' })}
            onMissingClick={() => setStatusDetails({ status: 'MISSING', tasks: dashboardData.missingTasksList || [], type: 'status' })}
            onMissingBacsClick={() => setIsMissingBacsDetailsOpen(true)}
            onPartialDeliveredClick={() => setStatusDetails({ status: 'PARTIAL_DELIVERED', tasks: dashboardData.partialDeliveredTasksList || [], type: 'status' })}
            onRedeliveryClick={() => setIsRedeliveryDetailsOpen(true)}
            onSensitiveDeliveriesClick={() => setIsSensitiveDeliveriesOpen(true)}
            onQualityAlertClick={() => setIsQualityAlertOpen(true)}
            onTotalRoundsClick={() => setIsAllRoundsDetailsOpen(true)}
          />

          <DriverPerformanceTable data={dashboardData.driverPerformance || []} isLoading={false} />
          
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tasks">Analyse des Tâches</TabsTrigger>
              <TabsTrigger value="rounds">Analyse des Tournées</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="mt-4 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dashboardData.tasksByStatus && dashboardData.tasksByStatus.length > 0 ? (
                  <TasksByStatusChart 
                    data={dashboardData.tasksByStatus} 
                    onStatusClick={handleStatusClick}
                  />
                ) : (
                   <Card className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Aucune donnée de tâche par statut pour cette période.</p>
                  </Card>
                )}
                 {dashboardData.tasksByProgression && dashboardData.tasksByProgression.length > 0 ? (
                  <TasksByProgressionChart 
                    data={dashboardData.tasksByProgression} 
                    onProgressionClick={handleProgressionClick}
                  />
                ) : (
                  <Card className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Aucune donnée de tâche par progression pour cette période.</p>
                  </Card>
                )}
              </div>
              <div className="grid grid-cols-1">
                 {dashboardData.tasksOverTime && dashboardData.tasksOverTime.length > 0 ? (
                  <TasksOverTimeChart data={dashboardData.tasksOverTime} />
                ) : (
                  <Card className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Aucune donnée de tâche par jour pour cette période.</p>
                  </Card>
                )}
              </div>
            </TabsContent>
            <TabsContent value="rounds" className="mt-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dashboardData.roundsByStatus && dashboardData.roundsByStatus.length > 0 ? (
                  <RoundsByStatusChart data={dashboardData.roundsByStatus} />
                ) : (
                   <Card className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Aucune donnée de tournée par statut pour cette période.</p>
                  </Card>
                )}
                 {dashboardData.roundsOverTime && dashboardData.roundsOverTime.length > 0 ? (
                  <RoundsOverTimeChart data={dashboardData.roundsOverTime} />
                ) : (
                  <Card className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Aucune donnée de tournée par jour pour cette période.</p>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {!isLoading && !error && dashboardData && !dashboardData.hasData && (
          <Card>
              <CardContent className="pt-6">
                  <p className="text-muted-foreground">Aucune donnée trouvée dans la base de données pour la période sélectionnée. Veuillez ajuster les filtres ou exporter de nouvelles données.</p>
              </CardContent>
          </Card>
      )}
    </main>
  );
}
