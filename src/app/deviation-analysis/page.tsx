
"use client";

import { useMemo } from "react";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Building, Clock, Percent, Scale, Warehouse } from "lucide-react";
import type { Tache, Tournee } from "@/lib/types";
import { useFilterContext } from "@/context/filter-context";
import { getDriverFullName, getDepotFromHub } from "@/lib/grouping";
import { format, differenceInMinutes, parseISO, addMinutes, subMinutes } from "date-fns";

interface Deviation {
  round: Tournee;
  totalWeight: number;
  capacity: number;
  deviation: number;
}

interface DeviationSummary {
    name: string;
    overloadRate: number;
    totalRounds: number;
    overweightRounds: number;
}

interface PunctualityIssue {
  task: Tache;
  plannedArriveTime: string;
  deviationMinutes: number; // positive for late, negative for early
}


const DeviationSummaryCard = ({ title, data, icon }: { title: string, data: DeviationSummary[], icon: React.ReactNode }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    {icon}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead className="text-right">Taux de Surcharge</TableHead>
                            <TableHead className="text-right">Tournées</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map(item => (
                            <TableRow key={item.name}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className={`text-right font-bold ${
                                    item.overloadRate > 10 ? 'text-destructive' :
                                    item.overloadRate > 5 ? 'text-orange-500' :
                                    'text-green-600'
                                }`}>
                                    {item.overloadRate.toFixed(2)}%
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">{item.totalRounds}</TableCell>
                            </TableRow>
                        ))}
                         {data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">Aucune donnée</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};


export default function DeviationAnalysisPage() {
  const { firestore } = useFirebase();
  const { dateRange } = useFilterContext();

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

  const { deviations, depotSummary, warehouseSummary, punctualityIssues } = useMemo(() => {
    if (!tasks || !rounds) {
      return { deviations: [], depotSummary: [], warehouseSummary: [], punctualityIssues: [] };
    }

    const { from, to } = dateRange || {};
    let filteredRounds = rounds;
    let filteredTasks = tasks;

    if (from) {
      const startOfDay = new Date(from);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = to ? new Date(to) : new Date(from);
      endOfDay.setHours(23, 59, 59, 999);

      const filterByDate = (item: Tache | Tournee) => {
        const itemDateString = item.date;
        if (!itemDateString) return false;
        const itemDate = new Date(itemDateString);
        return itemDate >= startOfDay && itemDate <= endOfDay;
      };

      filteredRounds = rounds.filter(filterByDate);
      filteredTasks = tasks.filter(filterByDate);
    }

    // --- Weight Deviation Logic ---
    const tasksWeightByRound = new Map<string, number>();
    for (const task of filteredTasks) {
       if (!task.nomTournee || !task.date || !task.nomHub) {
        continue;
      }
      const roundKey = `${task.nomTournee}-${task.date.split('T')[0]}-${task.nomHub}`;
      const taskWeight = task.dimensions?.poids ?? 0;

      if (taskWeight > 0) {
        const currentWeight = tasksWeightByRound.get(roundKey) || 0;
        tasksWeightByRound.set(roundKey, currentWeight + taskWeight);
      }
    }
    
    const weightResults: Deviation[] = [];
    const depotAggregation: Record<string, { totalRounds: number, overweightRounds: number }> = {};
    const warehouseAggregation: Record<string, { totalRounds: number, overweightRounds: number }> = {};

    for (const round of filteredRounds) {
      const roundCapacity = round.vehicle?.dimensions?.poids;
      
      if (typeof roundCapacity !== "number" || !round.name || !round.date || !round.nomHub) {
        continue;
      }
      
      const roundKey = `${round.name}-${round.date.split('T')[0]}-${round.nomHub}`;
      const totalWeight = tasksWeightByRound.get(roundKey) || 0;
      const isOverweight = totalWeight > roundCapacity;

      const depot = getDepotFromHub(round.nomHub);
      const warehouse = round.nomHub;

      if (depot) {
          if (!depotAggregation[depot]) depotAggregation[depot] = { totalRounds: 0, overweightRounds: 0 };
          depotAggregation[depot].totalRounds += 1;
          if (isOverweight) depotAggregation[depot].overweightRounds += 1;
      }
      if (warehouse) {
          if (!warehouseAggregation[warehouse]) warehouseAggregation[warehouse] = { totalRounds: 0, overweightRounds: 0 };
          warehouseAggregation[warehouse].totalRounds += 1;
          if (isOverweight) warehouseAggregation[warehouse].overweightRounds += 1;
      }

      if (isOverweight) {
        weightResults.push({
          round,
          totalWeight,
          capacity: roundCapacity,
          deviation: totalWeight - roundCapacity,
        });
      }
    }

    const calculateSummary = (aggregation: Record<string, any>): DeviationSummary[] => {
        return Object.entries(aggregation).map(([name, data]) => ({
            name,
            overloadRate: data.totalRounds > 0 ? (data.overweightRounds / data.totalRounds) * 100 : 0,
            totalRounds: data.totalRounds,
            overweightRounds: data.overweightRounds,
        })).sort((a, b) => b.overloadRate - a.overloadRate);
    }
    
    // --- Punctuality Logic ---
    const roundStopsByTaskId = new Map<string, any>();
    for (const round of filteredRounds) {
      if (round.stops) {
        for (const stop of round.stops) {
          if (stop.taskId) {
            roundStopsByTaskId.set(stop.taskId, stop);
          }
        }
      }
    }

    const punctualityResults: PunctualityIssue[] = [];
    for (const task of filteredTasks) {
      if (task.tacheId && task.creneauHoraire?.debut) {
        const stop = roundStopsByTaskId.get(task.tacheId);
        if (stop && stop.arriveTime) {
          try {
            const plannedArrive = parseISO(stop.arriveTime);
            
            // Check for earliness
            const windowStart = parseISO(task.creneauHoraire.debut);
            const earlyThreshold = subMinutes(windowStart, 15);
            if (plannedArrive < earlyThreshold) {
              const deviation = differenceInMinutes(earlyThreshold, plannedArrive);
              punctualityResults.push({
                task,
                plannedArriveTime: stop.arriveTime,
                deviationMinutes: -deviation
              });
              continue; // A task can't be both early and late
            }

            // Check for lateness
            if (task.creneauHoraire.fin) {
              const windowEnd = parseISO(task.creneauHoraire.fin);
              const lateThreshold = addMinutes(windowEnd, 15);
               if (plannedArrive > lateThreshold) {
                  const deviation = differenceInMinutes(plannedArrive, lateThreshold);
                  punctualityResults.push({
                    task,
                    plannedArriveTime: stop.arriveTime,
                    deviationMinutes: deviation
                  });
              }
            }
          } catch (e) {
            console.error("Error parsing date for punctuality:", e);
          }
        }
      }
    }


    return {
        deviations: weightResults.sort((a, b) => b.deviation - a.deviation),
        depotSummary: calculateSummary(depotAggregation),
        warehouseSummary: calculateSummary(warehouseAggregation),
        punctualityIssues: punctualityResults.sort((a, b) => Math.abs(b.deviationMinutes) - Math.abs(a.deviationMinutes)),
    };
  }, [tasks, rounds, dateRange]);

  const isLoading = isLoadingTasks || isLoadingRounds;
  const error = tasksError || roundsError;

  return (
    <main className="flex-1 container py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Analyse des Écarts & Ponctualité</h1>
      </div>

      {isLoading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
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
              Impossible de charger les données. Veuillez vérifier vos
              permissions et la configuration.
            </p>
            <pre className="mt-4 text-sm bg-background p-2 rounded">
              {error.message}
            </pre>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DeviationSummaryCard title="Synthèse par Dépôt" data={depotSummary} icon={<Building />} />
                <DeviationSummaryCard title="Synthèse par Entrepôt" data={warehouseSummary} icon={<Warehouse />} />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <Scale />
                    Détail des Tournées en Surcharge
                    </CardTitle>
                    <CardDescription>
                    Liste des tournées dont le poids total des tâches dépasse la capacité maximale du véhicule assigné.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {deviations.length > 0 ? (
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Tournée</TableHead>
                            <TableHead>Entrepôt</TableHead>
                            <TableHead>Livreur</TableHead>
                            <TableHead className="text-right">Poids Calculé (kg)</TableHead>
                            <TableHead className="text-right">Capacité (kg)</TableHead>
                            <TableHead className="text-right text-destructive">Ecart (kg)</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {deviations.map(({ round, totalWeight, capacity, deviation }) => (
                            <TableRow key={round.id}>
                            <TableCell>
                                {round.date
                                ? format(new Date(round.date), "dd/MM/yyyy")
                                : "N/A"}
                            </TableCell>
                            <TableCell className="font-medium">{round.name}</TableCell>
                            <TableCell>{round.nomHub || 'N/A'}</TableCell>
                            <TableCell>{getDriverFullName(round) || "N/A"}</TableCell>
                            <TableCell className="text-right font-mono">
                                {totalWeight.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                                {capacity.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-destructive">
                                +{deviation.toFixed(2)}
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>Aucune tournée en surcharge détectée pour la période sélectionnée.</p>
                    </div>
                    )}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <Clock />
                    Analyse de Ponctualité Prévisionnelle
                    </CardTitle>
                    <CardDescription>
                    Liste des tâches dont l'heure d'arrivée planifiée est en dehors du créneau horaire promis au client (tolérance de +/- 15 min).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {punctualityIssues.length > 0 ? (
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Tournée</TableHead>
                            <TableHead>Entrepôt</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Créneau Promis</TableHead>
                            <TableHead>Arrivée Prévue</TableHead>
                            <TableHead className="text-right">Écart (min)</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {punctualityIssues.map(({ task, plannedArriveTime, deviationMinutes }) => (
                            <TableRow key={task.tacheId}>
                            <TableCell>
                                {task.date
                                ? format(new Date(task.date), "dd/MM/yyyy")
                                : "N/A"}
                            </TableCell>
                            <TableCell className="font-medium">{task.nomTournee}</TableCell>
                            <TableCell>{task.nomHub || 'N/A'}</TableCell>
                            <TableCell>{task.contact?.personne || 'N/A'}</TableCell>
                            <TableCell>
                                {task.creneauHoraire?.debut ? format(new Date(task.creneauHoraire.debut), "HH:mm") : ''}
                                {task.creneauHoraire?.fin ? ` - ${format(new Date(task.creneauHoraire.fin), "HH:mm")}`: ''}
                            </TableCell>
                            <TableCell>{format(new Date(plannedArriveTime), "HH:mm")}</TableCell>
                            <TableCell className={`text-right font-bold ${deviationMinutes > 0 ? 'text-destructive' : 'text-blue-500'}`}>
                                {deviationMinutes > 0 ? `+${deviationMinutes}` : deviationMinutes} min
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>Aucun écart de ponctualité prévisionnel détecté pour la période sélectionnée.</p>
                    </div>
                    )}
                </CardContent>
            </Card>
        </div>
      )}
    </main>
  );
}
