
"use client";
import { use, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Download,
  Filter,
  HelpCircle,
  MoreVertical,
  Search,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DashboardStats } from "@/components/app/dashboard-stats";
import { RoundsOverTimeChart } from "@/components/app/rounds-over-time-chart";
import { TasksByStatusChart } from "@/components/app/tasks-by-status-chart";
import { RoundsByStatusChart } from "@/components/app/rounds-by-status-chart";
import { TasksByProgressionChart } from "@/components/app/tasks-by-progression-chart";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { firestore } from "@/firebase";
import { useQuery } from "@/firebase/firestore/use-query";
import { Task } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useFilterContext } from "@/context/filter-context";
import { endOfDay, format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { groupTasksByDay, groupTasksByMonth } from "@/lib/grouping";
import { calculateStats, Stats } from "@/lib/stats-calculator";
import { UnifiedExportForm } from "@/components/app/unified-export-form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Status =
  | "all"
  | "completed"
  | "failed"
  | "pending"
  | "in progress"
  | "cancelled";

const statusTranslations: Record<Status, string> = {
  all: "Tous",
  completed: "Terminé",
  failed: "Échec",
  pending: "En attente",
  "in progress": "En cours",
  cancelled: "Annulé",
};
export default function SummaryPage() {
  const { dateRange, setDateRange, depots, selectedDepot, setSelectedDepot } =
    useFilterContext();

  const [timeUnit, setTimeUnit] = useState<"day" | "month">("day");
  const [statusFilter, setStatusFilter] = useState<Status>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  // Separate loading states
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingCharts, setIsLoadingCharts] = useState(true);
  const [isLoadingTable, setIsLoadingTable] = useState(true);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const {
    data: tasks,
    loading: tasksLoading,
    error,
  } = useQuery<Task>(
    collection(firestore, "tasks"),
    [
      where("date", ">=", startOfDay(dateRange.from)),
      where("date", "<=", endOfDay(dateRange.to)),
      ...(selectedDepot !== "all"
        ? [where("depotId", "==", selectedDepot)]
        : []),
      ...(statusFilter !== "all"
        ? [where("status", "==", statusFilter)]
        : []),
    ],
    { refreshKey: 0 }
  );
  // Additional query for stats without status filter
  const { data: allTasksForStats, loading: statsLoadingQuery } =
    useQuery<Task>(
      collection(firestore, "tasks"),
      [
        where("date", ">=", startOfDay(dateRange.from)),
        where("date", "<=", endOfDay(dateRange.to)),
        ...(selectedDepot !== "all"
          ? [where("depotId", "==", selectedDepot)]
          : []),
      ],
      { refreshKey: 0 }
    );
  useEffect(() => {
    const loading = tasksLoading || statsLoadingQuery;
    setIsLoadingStats(loading);
    setIsLoadingCharts(loading);
    setIsLoadingTable(loading);

    if (!loading && allTasksForStats) {
      const calculatedStats = calculateStats(allTasksForStats);
      setStats(calculatedStats);
    }
  }, [tasksLoading, statsLoadingQuery, allTasksForStats]);
  const handleExport = () => {
    setIsExporting(true);
    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
    }, 2000);
  };

  const filteredTasks = useMemo(() => {
    if (!debouncedSearchQuery) {
      return tasks;
    }
    return tasks.filter(
      (task) =>
        task.id.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        task.driverId
          ?.toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()) ||
        task.status
          ?.toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()) ||
        task.roundId
          ?.toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()) ||
        task.depotId
          ?.toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()) ||
        (task.validation?.bacs &&
          task.validation.bacs.some((bac) =>
            bac.bacId.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
          ))
    );
  }, [tasks, debouncedSearchQuery]);

  const groupedTasks = useMemo(() => {
    if (timeUnit === "day") {
      return groupTasksByDay(filteredTasks);
    }
    return groupTasksByMonth(filteredTasks);
  }, [filteredTasks, timeUnit]);

  const chartData = useMemo(() => {
    return tasks
      .map((task) => ({
        ...task,
        date: new Date(task.date),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [tasks]);

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as Status);
  };
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="text-green-500" />;
      case "failed":
        return <XCircle className="text-red-500" />;
      case "pending":
        return <HelpCircle className="text-yellow-500" />;
      case "in progress":
        return <AlertCircle className="text-blue-500" />;
      default:
        return <HelpCircle className="text-gray-500" />;
    }
  };
  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <div className="flex items-center space-x-2">
          <DateRangePicker onUpdate={setDateRange} />
          <Select value={selectedDepot} onValueChange={setSelectedDepot}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les dépots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les dépots</SelectItem>
              {depots.map((depot) => (
                <SelectItem key={depot.id} value={depot.id}>
                  {depot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <UnifiedExportForm
            tasks={tasks}
            rounds={[]}
            stats={stats}
            dateRange={dateRange}
            depotId={selectedDepot}
          />
        </div>
      </div>

      <DashboardStats stats={stats} isLoading={isLoadingStats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-4">
        {isLoadingCharts ? (
          <>
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <RoundsOverTimeChart data={chartData} />
            <TasksByProgressionChart data={chartData} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-4">
        {isLoadingCharts ? (
          <>
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <TasksByStatusChart data={chartData} />
            <RoundsByStatusChart data={chartData} />
          </>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tâches</CardTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusTranslations).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher..."
                  className="pl-8 sm:w-[200px] md:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Select value={timeUnit} onValueChange={(value) => setTimeUnit(value as 'day' | 'month')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Grouper par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Jour</SelectItem>
                <SelectItem value="month">Mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Skeleton className="h-6 w-3/4" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <>
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
                      Impossible de charger les données. Veuillez vérifier vos
                      permissions et la configuration.
                    </p>
                    <pre className="mt-4 text-sm bg-background p-2 rounded">
                      {JSON.stringify(error, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
              {Object.entries(groupedTasks).map(([group, tasksInGroup]) => (
                <div key={group}>
                  <h3 className="text-lg font-semibold my-4">{group}</h3>
                  <Table>
                    <TableBody>
                      {(tasksInGroup as Task[]).map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="w-12">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  {getStatusIndicator(task.status)}
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{statusTranslations[task.status as Status] || task.status}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="font-medium">
                            <a
                              href={`/task/${task.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {task.id}
                            </a>
                          </TableCell>
                          <TableCell>{task.depotId}</TableCell>
                          <TableCell>
                            {format(new Date(task.date), "PPP", {
                              locale: fr,
                            })}
                          </TableCell>
                          <TableCell>
                            {task.driverId || "Non assigné"}
                          </TableCell>
                          <TableCell>
                            {task.validation?.bacs?.length || 0} Bacs
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
