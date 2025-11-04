
"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Search,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

import { Skeleton } from "@/components/ui/skeleton";
import { useFilters } from "@/context/filter-context";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { groupTasksByDay, groupTasksByMonth, getDriverFullName } from "@/lib/grouping";
import { calculateDashboardStats } from "@/lib/stats-calculator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Tache } from "@/lib/types";

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
  const { allTasks, allRounds, isContextLoading } = useFilters();

  const [timeUnit, setTimeUnit] = useState<"day" | "month">("day");
  const [statusFilter, setStatusFilter] = useState<Status>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const stats = useMemo(() => {
    if (isContextLoading || !allTasks) return null;
    return calculateDashboardStats(allTasks, allRounds, [], [], [], 'tous', 'all', 'all').stats;
  }, [allTasks, allRounds, isContextLoading]);
  

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const filteredTasks = useMemo(() => {
    let tasksToFilter = allTasks;
    if (statusFilter !== 'all') {
        tasksToFilter = tasksToFilter.filter(task => (task.progression?.toLowerCase() || 'unknown') === statusFilter);
    }
    if (debouncedSearchQuery) {
      tasksToFilter = tasksToFilter.filter(
        (task: any) =>
          task.tacheId?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          getDriverFullName(task)
            ?.toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()) ||
          task.nomTournee
            ?.toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()) ||
          task.nomHub
            ?.toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase())
      );
    }
    return tasksToFilter;
  }, [allTasks, debouncedSearchQuery, statusFilter]);

  const groupedTasks = useMemo(() => {
    if (timeUnit === "day") {
      return groupTasksByDay(filteredTasks);
    }
    return groupTasksByMonth(filteredTasks);
  }, [filteredTasks, timeUnit]);
  
  const getStatusIndicator = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return <CheckCircle2 className="text-green-500" />;
      case "failed":
        return <XCircle className="text-red-500" />;
      case "pending":
        return <HelpCircle className="text-yellow-500" />;
      case "ongoing":
        return <AlertCircle className="text-blue-500" />;
      default:
        return <HelpCircle className="text-gray-500" />;
    }
  };
  
  return (
    <main className="flex-1 p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Synthèse de la Journée/Période</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tâches</CardTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="failed">Échec</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="ongoing">En cours</SelectItem>
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
          {isContextLoading ? (
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
              {Object.keys(groupedTasks).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    Aucune tâche à afficher pour la sélection actuelle.
                </div>
              ) : Object.entries(groupedTasks).map(([group, tasksInGroup]) => (
                <div key={group}>
                  <h3 className="text-lg font-semibold my-4">{group}</h3>
                  <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>ID Tâche</TableHead>
                            <TableHead>Dépôt</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Livreur</TableHead>
                            <TableHead>Bacs</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(tasksInGroup as Tache[]).map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  {getStatusIndicator(task.progression)}
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{task.progression || 'Inconnu'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="font-medium">
                            <a
                              href={`/task/${task.tacheId}`}
                              className="text-blue-600 hover:underline"
                            >
                              {task.tacheId}
                            </a>
                          </TableCell>
                          <TableCell>{task.nomHub}</TableCell>
                          <TableCell>
                            {task.date ? format(new Date(task.date as string), "PPP", {
                              locale: fr,
                            }) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {getDriverFullName(task)}
                          </TableCell>
                          <TableCell>
                            {task.articles?.filter(a => a.type?.startsWith('BAC')).length || 0} Bacs
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
