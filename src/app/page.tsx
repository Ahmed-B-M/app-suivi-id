
"use client";

import { useMemo, useState } from "react";
import { useFilters } from "@/context/filter-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, AlertTriangle, ShieldAlert, Siren } from "lucide-react";
import { DashboardStats } from "@/components/app/dashboard-stats";
import { TasksByStatusChart } from "@/components/app/tasks-by-status-chart";
import { TasksByProgressionChart } from "@/components/app/tasks-by-progression-chart";
import { TasksOverTimeChart } from "@/components/app/tasks-over-time-chart";
import { RoundsByStatusChart } from "@/components/app/rounds-by-status-chart";
import { RoundsOverTimeChart } from "@/components/app/rounds-over-time-chart";
import type { Tache, Tournee } from "@/lib/types";
import { RatingDetailsDialog } from "@/components/app/rating-details-dialog";
import { PunctualityDetailsDialog, PunctualityTask } from "@/components/app/punctuality-details-dialog";
import { StatusDetailsDialog } from "@/components/app/status-details-dialog";
import { FailedDeliveryDetailsDialog } from "@/components/app/failed-delivery-details-dialog";
import { MissingBacsDetailsDialog } from "@/components/app/missing-bacs-details-dialog";
import { RedeliveryDetailsDialog } from "@/components/app/redelivery-details-dialog";
import { SensitiveDeliveriesDialog } from "@/components/app/sensitive-deliveries-dialog";
import { QualityAlertDialog } from "@/components/app/quality-alert-dialog";
import { AllRoundsDetailsDialog } from "@/components/app/all-rounds-details-dialog";
import { AllTasksDetailsDialog } from "@/components/app/all-tasks-details-dialog";
import { DriverPerformanceTable } from "@/components/app/driver-performance-table";
import { calculateDashboardStats } from "@/lib/stats-calculator";
import type { CategorizedComment } from "@/components/app/comment-analysis";
import { CommentSummaryCard } from "@/components/app/comment-summary-card";
import { VerbatimSummaryTable } from "@/components/app/verbatim-summary-table";
import { ScanbacDetailsDialog } from "@/components/app/scanbac-details-dialog";
import { ForcedAddressDetailsDialog } from "@/components/app/forced-address-details-dialog";
import { ForcedContactlessDetailsDialog } from "@/components/app/forced-contactless-details-dialog";
import { NpsByCarrierDetailsDialog } from "@/components/app/nps-by-carrier-details-dialog";
import { OverweightRoundsDetailsDialog } from "@/components/app/overweight-rounds-details-dialog";
import { OverbacsRoundsDetailsDialog } from "@/components/app/overbacs-rounds-details-dialog";
import { CompletedRoundsDetailsDialog } from "@/components/app/completed-rounds-details-dialog";


const AlertBadge = ({ count, label, icon }: { count: number, label: string, icon: React.ReactNode }) => {
  if (count === 0) return null;
  return (
    <div className="relative flex items-center gap-2 rounded-full bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1 text-sm font-semibold">
      <div className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-destructive animate-ping"></div>
      <div className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-destructive"></div>
      {icon}
      <span>{count} {label}</span>
    </div>
  );
};


export default function DashboardPage() {
  const { 
    allTasks,
    allRounds,
    allComments,
    allNpsData,
    processedVerbatims,
    isContextLoading,
    filterType,
    selectedDepot,
    selectedStore,
   } = useFilters();

  const [isRatingDetailsOpen, setIsRatingDetailsOpen] = useState(false);
  const [isNpsDetailsOpen, setIsNpsDetailsOpen] = useState(false);
  const [isFailedDeliveryDetailsOpen, setIsFailedDeliveryDetailsOpen] = useState(false);
  const [isMissingBacsDetailsOpen, setIsMissingBacsDetailsOpen] = useState(false);
  const [isRedeliveryDetailsOpen, setIsRedeliveryDetailsOpen] = useState(false);
  const [isSensitiveDeliveriesOpen, setIsSensitiveDeliveriesOpen] = useState(false);
  const [isQualityAlertOpen, setIsQualityAlertOpen] = useState(false);
  const [isAllRoundsDetailsOpen, setIsAllRoundsDetailsOpen] = useState(false);
  const [isAllTasksDetailsOpen, setIsAllTasksDetailsOpen] = useState(false);
  const [isScanbacDetailsOpen, setIsScanbacDetailsOpen] = useState(false);
  const [isForcedAddressDetailsOpen, setIsForcedAddressDetailsOpen] = useState(false);
  const [isForcedContactlessDetailsOpen, setIsForcedContactlessDetailsOpen] = useState(false);
  const [isOverweightDetailsOpen, setIsOverweightDetailsOpen] = useState(false);
  const [isOverbacsDetailsOpen, setIsOverbacsDetailsOpen] = useState(false);
  const [isCompletedRoundsDetailsOpen, setIsCompletedRoundsDetailsOpen] = useState(false);

  const [punctualityDetails, setPunctualityDetails] = useState<{
    type: 'early' | 'late' | 'late_over_1h';
    tasks: PunctualityTask[];
  } | null>(null);
  const [statusDetails, setStatusDetails] = useState<{ status: string; tasks: Tache[], type: 'status' | 'progression' } | null>(null);


  const handleStatusClick = (status: string) => {
      const tasksForStatus = allTasks.filter(task => {
        if (status === 'Unknown') {
          return !task.status || task.status === 'Unknown';
        }
        return (task.status || "Unknown") === status;
      });
      setStatusDetails({ status, tasks: tasksForStatus, type: 'status' });
    };

  const handleProgressionClick = (progression: string) => {
    const tasksForProgression = allTasks.filter(task => (task.progression || "Unknown") === progression);
    setStatusDetails({ status: progression, tasks: tasksForProgression, type: 'progression' });
  };


  const dashboardData = useMemo(() => {
    return calculateDashboardStats(allTasks, allRounds, allComments, allNpsData, processedVerbatims, filterType, selectedDepot, selectedStore);
  }, [allTasks, allRounds, allComments, allNpsData, processedVerbatims, filterType, selectedDepot, selectedStore]);

  const isLoading = isContextLoading;
  const error = null; 

  return (
    <div className="flex-1 space-y-8">
      <RatingDetailsDialog
        isOpen={isRatingDetailsOpen}
        onOpenChange={setIsRatingDetailsOpen}
        tasks={allTasks}
      />
      <NpsByCarrierDetailsDialog
        isOpen={isNpsDetailsOpen}
        onOpenChange={setIsNpsDetailsOpen}
        data={dashboardData?.npsByCarrier || []}
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
        allTasks={allTasks}
        redeliveryTaskIds={dashboardData?.redeliveriesList.map(t => t.tacheId) || []}
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
        rounds={allRounds}
      />
      <AllTasksDetailsDialog
        isOpen={isAllTasksDetailsOpen}
        onOpenChange={setIsAllTasksDetailsOpen}
        tasks={allTasks}
      />
      <ScanbacDetailsDialog
        isOpen={isScanbacDetailsOpen}
        onOpenChange={setIsScanbacDetailsOpen}
        tasks={dashboardData?.webCompletedTasks || []}
      />
      <ForcedAddressDetailsDialog
        isOpen={isForcedAddressDetailsOpen}
        onOpenChange={setIsForcedAddressDetailsOpen}
        tasks={dashboardData?.forcedAddressTasks || []}
      />
      <ForcedContactlessDetailsDialog
        isOpen={isForcedContactlessDetailsOpen}
        onOpenChange={setIsForcedContactlessDetailsOpen}
        tasks={dashboardData?.forcedContactlessTasks || []}
      />
       <OverweightRoundsDetailsDialog
        isOpen={isOverweightDetailsOpen}
        onOpenChange={setIsOverweightDetailsOpen}
        data={dashboardData?.overweightRoundsList || []}
      />
      <OverbacsRoundsDetailsDialog
        isOpen={isOverbacsDetailsOpen}
        onOpenChange={setIsOverbacsDetailsOpen}
        data={dashboardData?.overbacsRoundsList || []}
      />
      <CompletedRoundsDetailsDialog
        isOpen={isCompletedRoundsDetailsOpen}
        onOpenChange={setIsCompletedRoundsDetailsOpen}
        rounds={dashboardData?.completedRoundsList || []}
        allTasks={allTasks}
      />

       <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Tableau de Bord</h1>
          {dashboardData?.stats && (
            <>
              <AlertBadge
                count={dashboardData.stats.qualityAlerts}
                label="Alertes Qualité"
                icon={<AlertTriangle className="h-4 w-4" />}
              />
              <AlertBadge
                count={dashboardData.stats.sensitiveDeliveries}
                label="Livraisons Sensibles"
                icon={<Siren className="h-4 w-4" />}
              />
               <AlertBadge
                count={dashboardData.stats.failedTasks}
                label="Échecs"
                icon={<ShieldAlert className="h-4 w-4" />}
              />
            </>
          )}
        </div>
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
            onNpsClick={() => setIsNpsDetailsOpen(true)}
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
            onTotalTasksClick={() => setIsAllTasksDetailsOpen(true)}
            onScanbacClick={() => setIsScanbacDetailsOpen(true)}
            onForcedAddressClick={() => setIsForcedAddressDetailsOpen(true)}
            onForcedContactlessClick={() => setIsForcedContactlessDetailsOpen(true)}
            onOverweightClick={() => setIsOverweightDetailsOpen(true)}
            onOverbacsClick={() => setIsOverbacsDetailsOpen(true)}
            onCompletedRoundsClick={() => setIsCompletedRoundsDetailsOpen(true)}
          />

          {dashboardData.commentAnalysis && dashboardData.commentAnalysis.totalComments > 0 && (
            <CommentSummaryCard
              analysis={dashboardData.commentAnalysis}
            />
          )}

          {dashboardData.verbatimAnalysis && dashboardData.verbatimAnalysis.total > 0 && (
              <VerbatimSummaryTable analysis={dashboardData.verbatimAnalysis} />
          )}

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
                  <p className="text-muted-foreground">Aucune donnée trouvée pour la période et les filtres sélectionnés.</p>
              </CardContent>
          </Card>
      )}
    </div>
  );
}

    