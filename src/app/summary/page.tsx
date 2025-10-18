
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, Building, ChevronDown, Clock, MapPin, Percent, TrendingDown, TrendingUp, Warehouse } from "lucide-react";
import type { Tache, Tournee } from "@/lib/types";
import { useFilterContext } from "@/context/filter-context";
import { getDepotFromHub } from "@/lib/grouping";
import { format, differenceInMinutes, parseISO, addMinutes, subMinutes } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


interface SummaryMetrics {
    name: string;
    type: 'depot' | 'warehouse';
    totalRounds: number;
    overweightRoundsRate: number | null;
    punctualityRatePlanned: number | null;
    punctualityRateActual: number | null;
    mostFrequentTimeWindow: string;
    leastFrequentTimeWindow: string;
    mostLateTimeWindow: string;
    top3LatePostcodes: { postcode: string; count: number }[];
    avgTasksPer2Hours: number | null;
}

const countOccurrences = (arr: (string|undefined)[]) => {
    return arr.reduce((acc, curr) => {
        if (!curr) return acc;
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
};

const getMinMaxFromCounts = (counts: Record<string, number>) => {
    const entries = Object.entries(counts);
    if (entries.length === 0) return { most: 'N/A', least: 'N/A' };
    
    let most = entries[0];
    let least = entries[0];

    for(const entry of entries) {
        if (entry[1] > most[1]) most = entry;
        if (entry[1] < least[1]) least = entry;
    }
    return { most: most[0], least: least[0] };
};

const calculateMetricsForEntity = (name: string, type: 'depot' | 'warehouse', allTasks: Tache[], allRounds: Tournee[]): SummaryMetrics => {
    
    const entityFilter = (item: Tache | Tournee) => {
        const hub = item.nomHub;
        if (!hub) return false;
        if (type === 'depot') return getDepotFromHub(hub) === name;
        return hub === name;
    };
    const tasks = allTasks.filter(entityFilter);
    const rounds = allRounds.filter(entityFilter);

    // 1. Overweight rounds rate
    const tasksWeightByRound = new Map<string, number>();
    for (const task of tasks) {
       if (!task.nomTournee || !task.date || !task.nomHub) continue;
       const roundKey = `${task.nomTournee}-${task.date.split('T')[0]}-${task.nomHub}`;
       const taskWeight = task.dimensions?.poids ?? 0;
       if (taskWeight > 0) tasksWeightByRound.set(roundKey, (tasksWeightByRound.get(roundKey) || 0) + taskWeight);
    }
    let overweightRoundsCount = 0;
    const relevantRoundsForWeight = rounds.filter(r => typeof r.vehicle?.dimensions?.poids === 'number');
    for (const round of relevantRoundsForWeight) {
        if (!round.name || !round.date || !round.nomHub) continue;
        const roundKey = `${round.name}-${round.date.split('T')[0]}-${round.nomHub}`;
        const totalWeight = tasksWeightByRound.get(roundKey) || 0;
        if (totalWeight > round.vehicle!.dimensions!.poids!) overweightRoundsCount++;
    }
    const overweightRoundsRate = relevantRoundsForWeight.length > 0 ? (overweightRoundsCount / relevantRoundsForWeight.length) * 100 : null;
    
    // 2. Planned Punctuality
    const roundStopsByTaskId = new Map<string, any>();
    for (const round of rounds) {
      if (round.stops) round.stops.forEach(stop => stop.taskId && roundStopsByTaskId.set(stop.taskId, stop));
    }
    let plannedPunctual = 0;
    const tasksForPlannedPunctuality = tasks.filter(t => t.tacheId && t.creneauHoraire?.debut && roundStopsByTaskId.has(t.tacheId));
    tasksForPlannedPunctuality.forEach(task => {
        const stop = roundStopsByTaskId.get(task.tacheId!);
        if (!stop.arriveTime) return;
        try {
            const plannedArrive = parseISO(stop.arriveTime);
            const windowStart = parseISO(task.creneauHoraire!.debut!);
            const lowerBound = subMinutes(windowStart, 15);
            if (plannedArrive < lowerBound) return; // Early
            
            if (task.creneauHoraire!.fin) {
                const windowEnd = parseISO(task.creneauHoraire!.fin);
                const upperBound = addMinutes(windowEnd, 15);
                if (plannedArrive > upperBound) return; // Late
            }
            plannedPunctual++;
        } catch(e) {/* ignore date parsing errors */}
    });
    const punctualityRatePlanned = tasksForPlannedPunctuality.length > 0 ? (plannedPunctual / tasksForPlannedPunctuality.length) * 100 : null;

    // 3. Actual Punctuality
    let actualPunctual = 0;
    const lateTasksActual: Tache[] = [];
    const tasksForActualPunctuality = tasks.filter(t => t.progression === 'COMPLETED' && t.dateCloture && t.creneauHoraire?.debut);
    tasksForActualPunctuality.forEach(task => {
        try {
            const actualArrival = parseISO(task.dateCloture!);
            const windowStart = parseISO(task.creneauHoraire!.debut!);
            const lowerBound = subMinutes(windowStart, 15);

            if (actualArrival < lowerBound) return; // Early, not late

            if (task.creneauHoraire.fin) {
                const windowEnd = parseISO(task.creneauHoraire.fin);
                const upperBound = addMinutes(windowEnd, 15);
                 if (actualArrival > upperBound) {
                     lateTasksActual.push(task);
                     return; // Late
                 }
            }
            actualPunctual++;
        } catch(e) {/* ignore date parsing errors */}
    });
    const punctualityRateActual = tasksForActualPunctuality.length > 0 ? (actualPunctual / tasksForActualPunctuality.length) * 100 : null;

    // 4. Time Windows
    const timeWindows = tasks.map(t => {
        if (!t.creneauHoraire?.debut || !t.creneauHoraire.fin) return undefined;
        try {
            return `${format(parseISO(t.creneauHoraire.debut), 'HH:mm')}-${format(parseISO(t.creneauHoraire.fin), 'HH:mm')}`;
        } catch(e) { return undefined; }
    });
    const timeWindowCounts = countOccurrences(timeWindows);
    const { most: mostFrequentTimeWindow, least: leastFrequentTimeWindow } = getMinMaxFromCounts(timeWindowCounts);

    // 5. Late Time Windows
    const lateTimeWindows = lateTasksActual.map(t => {
        if (!t.creneauHoraire?.debut || !t.creneauHoraire.fin) return undefined;
        try {
            return `${format(parseISO(t.creneauHoraire.debut), 'HH:mm')}-${format(parseISO(t.creneauHoraire.fin), 'HH:mm')}`;
        } catch(e) { return undefined; }
    });
    const lateTimeWindowCounts = countOccurrences(lateTimeWindows);
    const { most: mostLateTimeWindow } = getMinMaxFromCounts(lateTimeWindowCounts);


    // 6. Top 3 Late Postcodes
    const latePostcodes = lateTasksActual.map(t => t.localisation?.codePostal).filter(Boolean);
    const latePostcodeCounts = countOccurrences(latePostcodes as string[]);
    const top3LatePostcodes = Object.entries(latePostcodeCounts)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 3)
        .map(([postcode, count]) => ({ postcode, count }));
    
    // 7. Avg tasks per 2 hours
    const totalServiceTimeHours = rounds.reduce((sum, round) => {
      const durationSeconds = round.totalOrderServiceTime;
      return durationSeconds ? sum + (durationSeconds / 3600) : sum;
    }, 0);
    const totalCompletedTasks = tasks.filter(t => t.progression === 'COMPLETED').length;
    const avgTasksPer2Hours = totalServiceTimeHours > 0 ? (totalCompletedTasks / totalServiceTimeHours) * 2 : null;

    return {
        name,
        type,
        totalRounds: rounds.length,
        overweightRoundsRate,
        punctualityRatePlanned,
        punctualityRateActual,
        mostFrequentTimeWindow,
        leastFrequentTimeWindow,
        mostLateTimeWindow,
        top3LatePostcodes,
        avgTasksPer2Hours
    }
};

const SummaryRow = ({ data, isSubRow = false }: { data: SummaryMetrics; isSubRow?: boolean }) => (
    <TableRow className={cn(isSubRow && "bg-muted/50")}>
        <TableCell className="font-medium">
            <div className={cn("flex items-center gap-2", isSubRow && "pl-6")}>
                {isSubRow ? <Warehouse className="h-4 w-4 text-muted-foreground"/> : <Building className="h-4 w-4 text-muted-foreground"/>}
                {data.name}
            </div>
        </TableCell>
        <TableCell className="text-right">{data.totalRounds}</TableCell>
        <TableCell className="text-right font-mono">{data.punctualityRatePlanned?.toFixed(1) ?? 'N/A'}%</TableCell>
        <TableCell className="text-right font-mono">{data.punctualityRateActual?.toFixed(1) ?? 'N/A'}%</TableCell>
        <TableCell className="text-right font-mono">{data.overweightRoundsRate?.toFixed(1) ?? 'N/A'}%</TableCell>
        <TableCell>
            <div className="flex flex-col text-xs">
                <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-green-500"/> {data.mostFrequentTimeWindow}</div>
                <div className="flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-500"/> {data.leastFrequentTimeWindow}</div>
            </div>
        </TableCell>
        <TableCell>
             <Badge variant="destructive">{data.mostLateTimeWindow}</Badge>
        </TableCell>
        <TableCell>
            <ol className="list-decimal list-inside text-xs">
                {data.top3LatePostcodes.map(pc => <li key={pc.postcode}>{pc.postcode} ({pc.count})</li>)}
                 {data.top3LatePostcodes.length === 0 && <li className="list-none">N/A</li>}
            </ol>
        </TableCell>
        <TableCell className="text-right font-mono">{data.avgTasksPer2Hours?.toFixed(1) ?? 'N/A'}</TableCell>
    </TableRow>
);


export default function SummaryPage() {
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

  const { depotSummary, warehouseSummaryByDepot } = useMemo(() => {
    if (!tasks || !rounds) {
      return { depotSummary: [], warehouseSummaryByDepot: new Map() };
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
    
    const allHubs = new Set(filteredTasks.map(t => t.nomHub).filter(Boolean) as string[]);
    const depotToHubsMap = new Map<string, Set<string>>();

    for (const hubName of allHubs) {
        const depotName = getDepotFromHub(hubName);
        if (!depotToHubsMap.has(depotName)) {
            depotToHubsMap.set(depotName, new Set());
        }
        if (hubName !== depotName) {
            depotToHubsMap.get(depotName)!.add(hubName);
        }
    }
    
    const depotMetrics: SummaryMetrics[] = [];
    const warehouseSummaryByDepot = new Map<string, SummaryMetrics[]>();

    for (const depotName of new Set(filteredTasks.map(t => getDepotFromHub(t.nomHub)))) {
        depotMetrics.push(calculateMetricsForEntity(depotName, 'depot', filteredTasks, filteredRounds));
        
        const hubSet = depotToHubsMap.get(depotName) || new Set();
        const hubMetrics: SummaryMetrics[] = [];
        for (const hubName of hubSet) {
            hubMetrics.push(calculateMetricsForEntity(hubName, 'warehouse', filteredTasks, filteredRounds));
        }
        warehouseSummaryByDepot.set(depotName, hubMetrics.sort((a,b) => b.totalRounds - a.totalRounds));
    }
    
    return {
        depotSummary: depotMetrics.sort((a,b) => b.totalRounds - a.totalRounds),
        warehouseSummaryByDepot
    };
  }, [tasks, rounds, dateRange]);


  const isLoading = isLoadingTasks || isLoadingRounds;
  const error = tasksError || roundsError;

  return (
    <main className="flex-1 container py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Synthèse Générale</h1>
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
        <Card>
            <CardHeader>
                <CardTitle>Récapitulatif par Dépôt</CardTitle>
                <CardDescription>Vue d'ensemble des indicateurs de performance clés par dépôt et par entrepôt/magasin.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" className="w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[15%]">Entité</TableHead>
                                <TableHead className="text-right w-[5%]">Tournées</TableHead>
                                <TableHead className="text-right w-[10%]"><Clock className="inline h-4"/> Ponct. Prév.</TableHead>
                                <TableHead className="text-right w-[10%]"><Clock className="inline h-4"/> Ponct. Réal.</TableHead>
                                <TableHead className="text-right w-[10%]"><Percent className="inline h-4"/> Surcharge Poids</TableHead>
                                <TableHead className="w-[15%]">Fenêtres Horaires (Pop.)</TableHead>
                                <TableHead className="w-[10%]">Fenêtre (Retards)</TableHead>
                                <TableHead className="w-[15%]"><MapPin className="inline h-4"/> Top 3 CP (Retards)</TableHead>
                                <TableHead className="text-right w-[10%]">Tâches / 2h</TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                              {depotSummary.map(depotData => {
                                  const warehouses = warehouseSummaryByDepot.get(depotData.name) || [];
                                  return (
                                      <AccordionItem key={depotData.name} value={depotData.name} asChild>
                                          <tbody className="group">
                                              <AccordionTrigger asChild>
                                                    <TableRow className="cursor-pointer hover:bg-muted/50 font-semibold data-[state=open]:bg-muted/50">
                                                        <TableCell className="w-[15%]">
                                                             <div className="flex items-center gap-2">
                                                                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                                                <Building className="h-4 w-4 text-muted-foreground"/>
                                                                {depotData.name}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right w-[5%]">{depotData.totalRounds}</TableCell>
                                                        <TableCell className="text-right font-mono w-[10%]">{depotData.punctualityRatePlanned?.toFixed(1) ?? 'N/A'}%</TableCell>
                                                        <TableCell className="text-right font-mono w-[10%]">{depotData.punctualityRateActual?.toFixed(1) ?? 'N/A'}%</TableCell>
                                                        <TableCell className="text-right font-mono w-[10%]">{depotData.overweightRoundsRate?.toFixed(1) ?? 'N/A'}%</TableCell>
                                                        <TableCell className="w-[15%]">
                                                            <div className="flex flex-col text-xs">
                                                                <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-green-500"/> {depotData.mostFrequentTimeWindow}</div>
                                                                <div className="flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-500"/> {depotData.leastFrequentTimeWindow}</div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="w-[10%]">
                                                            <Badge variant="destructive">{depotData.mostLateTimeWindow}</Badge>
                                                        </TableCell>
                                                        <TableCell className="w-[15%]">
                                                            <ol className="list-decimal list-inside text-xs">
                                                                {depotData.top3LatePostcodes.map(pc => <li key={pc.postcode}>{pc.postcode} ({pc.count})</li>)}
                                                                {depotData.top3LatePostcodes.length === 0 && <li className="list-none">N/A</li>}
                                                            </ol>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono w-[10%]">{depotData.avgTasksPer2Hours?.toFixed(1) ?? 'N/A'}</TableCell>
                                                    </TableRow>
                                              </AccordionTrigger>
                                              <AccordionContent asChild>
                                                  <TableRow>
                                                      <TableCell colSpan={9} className="p-0">
                                                          <Table>
                                                              <TableBody>
                                                                  {warehouses.map(whData => (
                                                                      <SummaryRow key={whData.name} data={whData} isSubRow={true} />
                                                                  ))}
                                                                  {warehouses.length === 0 && (
                                                                      <TableRow>
                                                                          <TableCell colSpan={9} className="text-center text-muted-foreground italic py-4 pl-12">
                                                                              Aucun magasin/entrepôt rattaché à ce dépôt pour la période sélectionnée.
                                                                          </TableCell>
                                                                      </TableRow>
                                                                  )}
                                                              </TableBody>
                                                          </Table>
                                                      </TableCell>
                                                  </TableRow>
                                              </AccordionContent>
                                          </tbody>
                                      </AccordionItem>
                                  )
                              })}
                              {depotSummary.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                        Aucune donnée à afficher pour la période sélectionnée.
                                    </TableCell>
                                </TableRow>
                              )}
                        </TableBody>
                    </Table>
                </Accordion>
            </CardContent>
        </Card>
      )}
    </main>
  );
}

    