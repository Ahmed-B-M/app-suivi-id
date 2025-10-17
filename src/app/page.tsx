
"use client";

import { useMemo, useState } from "react";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Calendar as CalendarIcon, Truck, User, Warehouse, Building } from "lucide-react";
import { DashboardStats } from "@/components/app/dashboard-stats";
import { TasksByStatusChart } from "@/components/app/tasks-by-status-chart";
import { TasksByProgressionChart } from "@/components/app/tasks-by-progression-chart";
import { TasksOverTimeChart } from "@/components/app/tasks-over-time-chart";
import { RoundsByStatusChart } from "@/components/app/rounds-by-status-chart";
import { RoundsOverTimeChart } from "@/components/app/rounds-over-time-chart";
import type { Tache, Tournee } from "@/lib/types";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, subDays, addMinutes, subMinutes, differenceInMinutes } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { RatingDetailsDialog } from "@/components/app/rating-details-dialog";
import { getDepotFromHub, getCarrierFromDriver, getDriverFullName } from "@/lib/grouping";
import { UnassignedDriversAlert } from "@/components/app/unassigned-drivers-alert";
import { PunctualityDetailsDialog, PunctualityTask } from "@/components/app/punctuality-details-dialog";
import { StatusDetailsDialog } from "@/components/app/status-details-dialog";
import { FailedDeliveryDetailsDialog } from "@/components/app/failed-delivery-details-dialog";
import { MissingBacsDetailsDialog } from "@/components/app/missing-bacs-details-dialog";
import { RedeliveryDetailsDialog } from "@/components/app/redelivery-details-dialog";
import { SensitiveDeliveriesDialog } from "@/components/app/sensitive-deliveries-dialog";
import { QualityAlertDialog } from "@/components/app/quality-alert-dialog";

export default function DashboardPage() {
  const { firestore } = useFirebase();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [selectedDepot, setSelectedDepot] = useState<string>("all");
  const [selectedEntrepots, setSelectedEntrepots] = useState<string>("all");
  const [selectedCarrier, setSelectedCarrier] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [isRatingDetailsOpen, setIsRatingDetailsOpen] = useState(false);
  const [isFailedDeliveryDetailsOpen, setIsFailedDeliveryDetailsOpen] = useState(false);
  const [isMissingBacsDetailsOpen, setIsMissingBacsDetailsOpen] = useState(false);
  const [isRedeliveryDetailsOpen, setIsRedeliveryDetailsOpen] = useState(false);
  const [isSensitiveDeliveriesOpen, setIsSensitiveDeliveriesOpen] = useState(false);
  const [isQualityAlertOpen, setIsQualityAlertOpen] = useState(false);
  const [punctualityDetails, setPunctualityDetails] = useState<{
    type: 'early' | 'late';
    tasks: PunctualityTask[];
  } | null>(null);
  const [statusDetails, setStatusDetails] = useState<{ status: string; tasks: Tache[], type: 'status' | 'progression' } | null>(null);


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

  const { depotNames, entrepotNames, carrierNames, driverNames } = useMemo(() => {
    if (!tasks && !rounds) return { depotNames: [], entrepotNames: [], carrierNames: [], driverNames: [] };
    const depots = new Set<string>();
    const entrepots = new Set<string>();
    const carriers = new Set<string>();
    const drivers = new Set<string>();
    
    const allItems: (Tache | Tournee)[] = [...(tasks || []), ...(rounds || [])];

    allItems.forEach((item) => {
      if ('nomHub' in item && item.nomHub) {
        depots.add(getDepotFromHub(item.nomHub));
        entrepots.add(item.nomHub);
      }
      const driverName = getDriverFullName(item);
      if (driverName) {
        drivers.add(driverName);
        carriers.add(getCarrierFromDriver(driverName));
      } else {
        carriers.add("Inconnu");
      }
    });

    return { 
      depotNames: Array.from(depots).sort(),
      entrepotNames: Array.from(entrepots).sort(),
      carrierNames: Array.from(carriers).sort(),
      driverNames: Array.from(drivers).sort(),
    };
  }, [tasks, rounds]);


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
    
    // Filter by depot
    if (selectedDepot !== "all") {
      const filterLogic = (item: Tache | Tournee) => 'nomHub' in item && getDepotFromHub(item.nomHub) === selectedDepot;
      filteredTasks = filteredTasks.filter(filterLogic);
      filteredRounds = filteredRounds.filter(filterLogic);
    }
    
    // Filter by entrepot (hubName)
    if (selectedEntrepots !== "all") {
      const filterLogic = (item: Tache | Tournee) => 'nomHub' in item && item.nomHub === selectedEntrepots;
      filteredTasks = filteredTasks.filter(filterLogic);
      filteredRounds = filteredRounds.filter(filterLogic);
    }

    // Filter by carrier
    if (selectedCarrier !== "all") {
      filteredTasks = filteredTasks.filter(t => getCarrierFromDriver(getDriverFullName(t)) === selectedCarrier);
      filteredRounds = filteredRounds.filter(r => getCarrierFromDriver(getDriverFullName(r)) === selectedCarrier);
    }
    
    // Filter by driver
    if (selectedDriver !== "all") {
      filteredTasks = filteredTasks.filter(t => getDriverFullName(t) === selectedDriver);
      filteredRounds = filteredRounds.filter(r => getDriverFullName(r) === selectedDriver);
    }

    return { tasks: filteredTasks, rounds: filteredRounds };
  }, [tasks, rounds, dateRange, selectedDepot, selectedEntrepots, selectedCarrier, selectedDriver]);

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
    if (!filteredData.tasks && !filteredData.rounds) return null;

    const totalTasks = filteredData.tasks.length;
    const completedTasksList = filteredData.tasks.filter(
      (t) => t.progression === "COMPLETED"
    );
    const totalCompletedTasks = completedTasksList.length;

    if (totalTasks === 0 && filteredData.rounds.length === 0) {
      return { hasData: false };
    }

    const ratedTasks = completedTasksList.map(t => {
      const rating = t.metaDonnees?.notationLivreur;
      return typeof rating === 'number' ? rating : null;
    }).filter((r): r is number => r !== null);
    
    const averageRating =
      ratedTasks.length > 0
        ? ratedTasks.reduce((sum, rating) => sum + rating, 0) /
          ratedTasks.length
        : null;
        
    let punctualTasks = 0;
    const earlyTasks: PunctualityTask[] = [];
    const lateTasks: PunctualityTask[] = [];
    const completedTasksWithTime = completedTasksList.filter(
        t => t.creneauHoraire?.debut && t.dateCloture
    );
    
    completedTasksWithTime.forEach(task => {
        const closureTime = new Date(task.dateCloture!);
        const windowStart = new Date(task.creneauHoraire!.debut!);
        const windowEnd = task.creneauHoraire!.fin ? new Date(task.creneauHoraire!.fin) : addMinutes(windowStart, 120); // Default to 2h window if no end

        const lowerBound = subMinutes(windowStart, 15);
        const upperBound = addMinutes(windowEnd, 15);

        if (closureTime < lowerBound) {
            earlyTasks.push({ task, minutes: differenceInMinutes(lowerBound, closureTime) });
        } else if (closureTime > upperBound) {
            lateTasks.push({ task, minutes: differenceInMinutes(closureTime, upperBound) });
        } else {
            punctualTasks++;
        }
    });

    const punctualityRate = completedTasksWithTime.length > 0
      ? (punctualTasks / completedTasksWithTime.length) * 100
      : null;

    const mobileValidations = completedTasksList.filter(t => t.completePar === 'mobile').length;
    const scanbacRate = totalCompletedTasks > 0 ? (mobileValidations / totalCompletedTasks) * 100 : 0;

    const incorrectAddresses = completedTasksList.filter(t => t.heureReelle?.arrivee?.adresseCorrecte === false).length;
    const forcedAddressRate = totalCompletedTasks > 0 ? (incorrectAddresses / totalCompletedTasks) * 100 : 0;
    
    const forcedContactless = completedTasksList.filter(t => t.execution?.sansContact?.forced === true).length;
    const forcedContactlessRate = totalCompletedTasks > 0 ? (forcedContactless / totalCompletedTasks) * 100 : 0;
    
    const failedTasksList = filteredData.tasks.filter(
      (t) => t.progression === "COMPLETED" && t.status === "NOT_DELIVERED"
    );
    const failedTasksCount = failedTasksList.length;

    const failedDeliveryRate = totalCompletedTasks > 0 ? (failedTasksCount / totalCompletedTasks) * 100 : null;

    const redeliveriesList = filteredData.tasks.filter(t => (t.tentatives ?? 1) >= 2 && t.status !== 'DELIVERED');

    const pendingTasksList = filteredData.tasks.filter(t => t.status === "PENDING");
    const missingTasksList = filteredData.tasks.filter(t => t.status === "MISSING");
    const partialDeliveredTasksList = filteredData.tasks.filter(t => t.status === "PARTIAL_DELIVERED");
    
    const tasksWithMissingBacs = filteredData.tasks.filter(task => 
      task.articles && task.articles.some(article => article.statut === 'MISSING')
    );

    const sensitiveKeywords = ['pièce', 'identité', 'gendarmerie', 'caserne', 'police', 'militaire'];
    const sensitiveDeliveriesList = filteredData.tasks.filter(t => {
      if (!t.instructions) return false;
      const lowercasedInstructions = t.instructions.toLowerCase();
      return sensitiveKeywords.some(keyword => lowercasedInstructions.includes(keyword));
    });

    const qualityAlertTasks = filteredData.tasks.filter(
      (t) => typeof t.metaDonnees?.notationLivreur === 'number' && t.metaDonnees.notationLivreur < 4
    );

    const taskStats = {
      totalTasks: totalTasks,
      completedTasks: totalCompletedTasks,
      failedTasks: failedTasksCount,
      averageRating: averageRating,
      punctualityRate: punctualityRate,
      earlyTasksCount: earlyTasks.length,
      lateTasksCount: lateTasks.length,
      scanbacRate: scanbacRate,
      forcedAddressRate: forcedAddressRate,
      forcedContactlessRate: forcedContactlessRate,
      pendingTasks: pendingTasksList.length,
      missingTasks: missingTasksList.length,
      missingBacs: tasksWithMissingBacs.length,
      partialDeliveredTasks: partialDeliveredTasksList.length,
      redeliveries: redeliveriesList.length,
      failedDeliveryRate: failedDeliveryRate,
      sensitiveDeliveries: sensitiveDeliveriesList.length,
      qualityAlerts: qualityAlertTasks.length,
    };

    const roundStats = filteredData.rounds
      ? {
          totalRounds: filteredData.rounds.length,
           completedRounds: filteredData.rounds.filter(
            (r) => r.status === "COMPLETED"
          ).length,
        }
      : { totalRounds: 0, completedRounds: 0 };

     const tasksByStatus = filteredData.tasks.reduce((acc, task) => {
      const status = task.status || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tasksByProgression = filteredData.tasks.reduce((acc, task) => {
      const progression = task.progression || "Unknown";
      acc[progression] = (acc[progression] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tasksOverTime = filteredData.tasks
      ? filteredData.tasks.reduce((acc, task) => {
          const date = task.date ? task.date.split("T")[0] : "Non planifiée";
          if (date === "Non planifiée" && !task.unplanned) return acc;
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {};

    const roundsByStatus = filteredData.rounds
      ? filteredData.rounds.reduce((acc, round) => {
          const status = round.status || "Unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {};

    const roundsOverTime = filteredData.rounds
      ? filteredData.rounds.reduce((acc, round) => {
          const date = round.date ? round.date.split("T")[0] : "Unknown";
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {};

    const unassignedDrivers = new Set<string>();
    if (selectedCarrier === 'Inconnu' || selectedCarrier === 'all') {
        const allItems = [...filteredData.tasks, ...filteredData.rounds];
        allItems.forEach(item => {
            const driverName = getDriverFullName(item);
            if (getCarrierFromDriver(driverName) === 'Inconnu' && driverName) {
                unassignedDrivers.add(driverName);
            }
        });
    }

    const hasData = filteredData.tasks.length > 0 || filteredData.rounds.length > 0;

    return {
      hasData,
      stats: { ...taskStats, ...roundStats },
      earlyTasks,
      lateTasks,
      failedTasksList,
      pendingTasksList,
      missingTasksList,
      tasksWithMissingBacs,
      partialDeliveredTasksList,
      redeliveriesList,
      sensitiveDeliveriesList,
      qualityAlertTasks,
      tasksByStatus: Object.entries(tasksByStatus).map(([name, value]) => ({
        name,
        value,
      })),
      tasksByProgression: Object.entries(tasksByProgression).map(([name, value]) => ({
        name,
        value,
      })),
      tasksOverTime: Object.entries(tasksOverTime)
        .map(([date, count]) => ({
          date,
          count,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      roundsByStatus: Object.entries(roundsByStatus).map(([name, value]) => ({
        name,
        value,
      })),
      roundsOverTime: Object.entries(roundsOverTime)
        .map(([date, count]) => ({
          date,
          count,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      unassignedDrivers: Array.from(unassignedDrivers),
    };
  }, [filteredData]);

  const isLoading = isLoadingTasks || isLoadingRounds;
  const error = tasksError || roundsError;

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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Tableau de Bord</h1>
        <div className="flex flex-wrap items-center gap-2">
           <Select value={selectedDepot} onValueChange={setSelectedDepot}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Building className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrer par dépôt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les dépôts</SelectItem>
              {depotNames.map((depot) => (
                <SelectItem key={depot} value={depot}>
                  {depot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
           <Select value={selectedEntrepots} onValueChange={setSelectedEntrepots}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Warehouse className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrer par entrepôt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les entrepôts</SelectItem>
              {entrepotNames.map((entrepot) => (
                <SelectItem key={entrepot} value={entrepot}>
                  {entrepot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
           <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Truck className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrer par transporteur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les transporteurs</SelectItem>
              {carrierNames.map((carrier) => (
                <SelectItem key={carrier} value={carrier}>
                  {carrier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedDriver} onValueChange={setSelectedDriver}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <User className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrer par livreur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les livreurs</SelectItem>
              {driverNames.map((driver) => (
                <SelectItem key={driver} value={driver}>
                  {driver}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full sm:w-[300px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Choisir une période</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
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
            stats={dashboardData.stats} 
            onRatingClick={() => setIsRatingDetailsOpen(true)}
            onEarlyClick={() => setPunctualityDetails({ type: 'early', tasks: dashboardData.earlyTasks })}
            onLateClick={() => setPunctualityDetails({ type: 'late', tasks: dashboardData.lateTasks })}
            onFailedDeliveryClick={() => setIsFailedDeliveryDetailsOpen(true)}
            onPendingClick={() => setStatusDetails({ status: 'PENDING', tasks: dashboardData.pendingTasksList, type: 'status' })}
            onMissingClick={() => setStatusDetails({ status: 'MISSING', tasks: dashboardData.missingTasksList, type: 'status' })}
            onMissingBacsClick={() => setIsMissingBacsDetailsOpen(true)}
            onPartialDeliveredClick={() => setStatusDetails({ status: 'PARTIAL_DELIVERED', tasks: dashboardData.partialDeliveredTasksList, type: 'status' })}
            onRedeliveryClick={() => setIsRedeliveryDetailsOpen(true)}
            onSensitiveDeliveriesClick={() => setIsSensitiveDeliveriesOpen(true)}
            onQualityAlertClick={() => setIsQualityAlertOpen(true)}
          />
          
          <UnassignedDriversAlert unassignedDrivers={dashboardData.unassignedDrivers} />

          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tasks">Analyse des Tâches</TabsTrigger>
              <TabsTrigger value="rounds">Analyse des Tournées</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="mt-4 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dashboardData.tasksByStatus.length > 0 ? (
                  <TasksByStatusChart 
                    data={dashboardData.tasksByStatus} 
                    onStatusClick={handleStatusClick}
                  />
                ) : (
                   <Card className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Aucune donnée de tâche par statut pour cette période.</p>
                  </Card>
                )}
                 {dashboardData.tasksByProgression.length > 0 ? (
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
                 {dashboardData.tasksOverTime.length > 0 ? (
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
                {dashboardData.roundsByStatus.length > 0 ? (
                  <RoundsByStatusChart data={dashboardData.roundsByStatus} />
                ) : (
                   <Card className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Aucune donnée de tournée par statut pour cette période.</p>
                  </Card>
                )}
                 {dashboardData.roundsOverTime.length > 0 ? (
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

    