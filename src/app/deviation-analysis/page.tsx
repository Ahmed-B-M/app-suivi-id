
"use client";

import { useMemo } from "react";
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
import { AlertCircle, Building, Clock, Percent, Scale, Warehouse, Box, Truck, Star, MapPin, TrendingUp, TrendingDown, Hourglass } from "lucide-react";
import type { Tache, Tournee } from "@/lib/types";
import { useFilters } from "@/context/filter-context";
import { getDriverFullName, getDepotFromHub, getCarrierFromDriver } from "@/lib/grouping";
import { format, differenceInMinutes, parseISO, addMinutes, subMinutes } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";


interface Deviation {
  round: Tournee;
  totalWeight: number;
  capacity: number;
  deviation: number;
}

interface BacDeviation {
  round: Tournee;
  totalBacs: number;
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
  plannedArriveTime?: string;
  deviationMinutes: number; // positive for late, negative for early
}

interface AggregatedStats {
    punctualityRealized: number | null;
    punctualityPlanned: number | null;
    overweightRate: number | null;
    averageRating: number | null;
    popularTimeWindow: string;
    unpopularTimeWindow: string;
    topLateZipCodes: { zip: string; count: number }[];
    ordersPer2h: number | null;
}

interface AggregationGroup {
    stats: AggregatedStats;
    byWarehouse?: Record<string, AggregationGroup>;
    byCarrier?: Record<string, AggregationGroup>;
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
                                    'text-blue-600'
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

const AggregationAccordion = ({ data, title, icon }: { data: Record<string, AggregationGroup>, title: string, icon: React.ReactNode }) => (
    <Accordion type="multiple" className="w-full space-y-4">
        {Object.entries(data).map(([name, groupData]) => (
            <AccordionItem value={name} key={name}>
                 <Card>
                    <AccordionTrigger className="p-4 text-lg font-semibold hover:no-underline">
                        <div className="flex w-full items-center justify-between pr-2">
                             <span className="flex items-center gap-2">
                                {icon} {name}
                            </span>
                            <div className="flex items-center gap-4 text-sm">
                               <Badge variant={groupData.stats.punctualityRealized && groupData.stats.punctualityRealized >= 95 ? "default" : "destructive"}>
                                   Ponctualité: {groupData.stats.punctualityRealized?.toFixed(1) ?? 'N/A'}%
                               </Badge>
                               <Badge variant={groupData.stats.averageRating && groupData.stats.averageRating >= 4.7 ? "default" : "destructive"}>
                                   Note: {groupData.stats.averageRating?.toFixed(2) ?? 'N/A'}
                               </Badge>
                           </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 border-t">
                        <div className="py-4">
                            <StatGrid stats={groupData.stats} />
                        </div>
                        {groupData.byWarehouse && (
                             <div className="mt-4">
                                <h4 className="font-semibold text-muted-foreground mb-2">Par Entrepôt:</h4>
                                <AggregationAccordion data={groupData.byWarehouse} title="Entrepôt" icon={<Warehouse />} />
                            </div>
                        )}
                        {groupData.byCarrier && (
                            <div className="mt-4">
                                <h4 className="font-semibold text-muted-foreground mb-2">Par Transporteur:</h4>
                                <AggregationAccordion data={groupData.byCarrier} title="Transporteur" icon={<Truck />} />
                            </div>
                        )}
                    </AccordionContent>
                </Card>
            </AccordionItem>
        ))}
    </Accordion>
);


const StatGrid = ({ stats }: { stats: AggregatedStats }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <StatDisplay icon={<Clock />} label="Ponctualité Réalisée" value={`${stats.punctualityRealized?.toFixed(1) ?? 'N/A'}%`} />
        <StatDisplay icon={<Clock className="text-blue-500"/>} label="Ponctualité Prévue" value={`${stats.punctualityPlanned?.toFixed(1) ?? 'N/A'}%`} />
        <StatDisplay icon={<Scale />} label="Surcharge Poids" value={`${stats.overweightRate?.toFixed(1) ?? 'N/A'}%`} />
        <StatDisplay icon={<Star />} label="Note Moyenne" value={stats.averageRating?.toFixed(2) ?? 'N/A'} />
        <StatDisplay icon={<TrendingUp />} label="Créneau Populaire" value={stats.popularTimeWindow} />
        <StatDisplay icon={<TrendingDown />} label="Créneau Impopulaire" value={stats.unpopularTimeWindow} />
        <StatDisplay icon={<Hourglass />} label="Charge / 2h" value={`${stats.ordersPer2h?.toFixed(1) ?? 'N/A'} cmd`} />
        <div className="space-y-1">
            <p className="flex items-center gap-2 font-semibold text-muted-foreground"><MapPin/> Top 3 Retards (CP)</p>
            <ol className="list-decimal list-inside">
                {stats.topLateZipCodes.map(z => <li key={z.zip}>{z.zip} ({z.count} retards)</li>)}
                 {stats.topLateZipCodes.length === 0 && <li className="text-muted-foreground">Aucun retard</li>}
            </ol>
        </div>
    </div>
);


const StatDisplay = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="space-y-1">
        <p className="flex items-center gap-2 font-semibold text-muted-foreground">{icon}{label}</p>
        <p className="text-xl font-bold">{value}</p>
    </div>
);


export default function DeviationAnalysisPage() {
  const { allTasks, allRounds, isContextLoading, allCarrierRules } = useFilters();
  const BAC_LIMIT = 105;

  const { deviations, depotSummary, warehouseSummary, punctualityIssues, bacDeviations, aggregatedStats } = useMemo(() => {
    if (isContextLoading || !allTasks || !allRounds) {
      return { deviations: [], depotSummary: [], warehouseSummary: [], punctualityIssues: [], bacDeviations: [], aggregatedStats: {} };
    }

    const tasksWeightByRound = new Map<string, number>();
    for (const task of allTasks) {
       if (!task.nomTournee || !task.date || !task.nomHub) continue;
       const roundKey = `${task.nomTournee}-${new Date(task.date as string).toISOString().split('T')[0]}-${task.nomHub}`;
       const taskWeight = task.poidsEnKg ?? 0;
       if (taskWeight > 0) tasksWeightByRound.set(roundKey, (tasksWeightByRound.get(roundKey) || 0) + taskWeight);
    }
    
    const tasksBacsByRound = new Map<string, number>();
    for (const task of allTasks) {
        if (!task.nomTournee || !task.date || !task.nomHub) continue;
        const roundKey = `${task.nomTournee}-${new Date(task.date as string).toISOString().split('T')[0]}-${task.nomHub}`;
        const bacCount = (task.articles ?? []).filter((a: any) => a.type === 'BAC_SEC' || a.type === 'BAC_FRAIS').length;
        if (bacCount > 0) tasksBacsByRound.set(roundKey, (tasksBacsByRound.get(roundKey) || 0) + bacCount);
    }

    const weightResults: Deviation[] = [];
    const bacResults: BacDeviation[] = [];
    const depotAggregation: Record<string, { totalRounds: number, overweightRounds: number }> = {};
    const warehouseAggregation: Record<string, { totalRounds: number, overweightRounds: number }> = {};

    const allGroupedRounds = allRounds.map(round => ({
        round, 
        tasks: allTasks.filter(t => t.hubId === round.hubId && t.nomTournee === round.nom && t.date && round.date && new Date(t.date as string).toDateString() === new Date(round.date as string).toDateString()),
        depot: getDepotFromHub(round.nomHub),
        warehouse: round.nomHub,
        carrier: getCarrierFromDriver(round, allCarrierRules) 
    }));
    
    const processGroup = (group: typeof allGroupedRounds): AggregatedStats => {
        const tasksInGroup = group.flatMap(g => g.tasks);
        const completedTasks = tasksInGroup.filter(t => t.progression === 'COMPLETED');
        
        const punctualityTasksRealized = completedTasks.filter(t => t.debutCreneauInitial && t.dateCloture);
        let punctualRealizedCount = 0;
        punctualityTasksRealized.forEach(task => {
            try {
                const arrival = parseISO(task.dateCloture as string);
                const windowStart = parseISO(task.debutCreneauInitial as string);
                const windowEnd = task.finCreneauInitial ? parseISO(task.finCreneauInitial as string) : addMinutes(windowStart, 120);
                if (arrival >= subMinutes(windowStart, 15) && arrival <= addMinutes(windowEnd, 15)) punctualRealizedCount++;
            } catch {}
        });

        const punctualityTasksPlanned = tasksInGroup.filter(t => t.heureArriveeEstimee && t.debutCreneauInitial);
        let punctualPlannedCount = 0;
        const lateZipCodes: Record<string, number> = {};
        punctualityTasksPlanned.forEach(task => {
            try {
                const plannedArrive = parseISO(task.heureArriveeEstimee as string);
                const windowStart = parseISO(task.debutCreneauInitial as string);
                const windowEnd = task.finCreneauInitial ? parseISO(task.finCreneauInitial as string) : addMinutes(windowStart, 120);
                
                if (plannedArrive >= subMinutes(windowStart, 15) && plannedArrive <= addMinutes(windowEnd, 15)) {
                    punctualPlannedCount++;
                } else if (plannedArrive > addMinutes(windowEnd, 15)) {
                    if (task.codePostal) lateZipCodes[task.codePostal] = (lateZipCodes[task.codePostal] || 0) + 1;
                }
            } catch {}
        });

        const ratedTasks = completedTasks.map(t => t.notationLivreur).filter((r): r is number => typeof r === 'number');
        const timeWindows = completedTasks.map(t => `${t.debutFenetre ? format(new Date(t.debutFenetre), 'HH:mm') : ''}-${t.finFenetre ? format(new Date(t.finFenetre), 'HH:mm') : ''}`);
        const timeWindowCounts = timeWindows.reduce((acc, tw) => { acc[tw] = (acc[tw] || 0) + 1; return acc; }, {} as Record<string, number>);
        const sortedTimeWindows = Object.entries(timeWindowCounts).sort((a, b) => b[1] - a[1]);
        
        const totalDurationHours = group.reduce((sum, g) => sum + ((g.round.dureeReel ?? g.round.tempsTotal ?? 0) / 3600000), 0);
        const ordersPer2h = totalDurationHours > 0 ? (tasksInGroup.length / (totalDurationHours / 2)) : null;

        return {
            punctualityRealized: punctualityTasksRealized.length > 0 ? (punctualRealizedCount / punctualityTasksRealized.length) * 100 : null,
            punctualityPlanned: punctualityTasksPlanned.length > 0 ? (punctualPlannedCount / punctualityTasksPlanned.length) * 100 : null,
            overweightRate: group.length > 0 ? (group.filter(g => (g.round.poidsReel ?? 0) > (g.round.capacitePoids ?? Infinity)).length / group.length) * 100 : null,
            averageRating: ratedTasks.length > 0 ? ratedTasks.reduce((s, r) => s + r, 0) / ratedTasks.length : null,
            popularTimeWindow: sortedTimeWindows[0]?.[0] || 'N/A',
            unpopularTimeWindow: sortedTimeWindows[sortedTimeWindows.length - 1]?.[0] || 'N/A',
            topLateZipCodes: Object.entries(lateZipCodes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([zip, count]) => ({ zip, count })),
            ordersPer2h: ordersPer2h
        };
    };

    const aggregatedStats: Record<string, AggregationGroup> = {};
    const depots = [...new Set(allGroupedRounds.map(g => g.depot))];

    depots.forEach(depot => {
        if (!depot) return;
        const roundsForDepot = allGroupedRounds.filter(g => g.depot === depot);
        const depotStats = processGroup(roundsForDepot);
        
        const byWarehouse: Record<string, AggregationGroup> = {};
        const warehouses = [...new Set(roundsForDepot.map(g => g.warehouse))];
        warehouses.forEach(warehouse => {
             if (!warehouse) return;
             byWarehouse[warehouse] = { stats: processGroup(roundsForDepot.filter(g => g.warehouse === warehouse)) };
        });

        const byCarrier: Record<string, AggregationGroup> = {};
        const carriers = [...new Set(roundsForDepot.map(g => g.carrier))];
        carriers.forEach(carrier => {
             if (!carrier) return;
             byCarrier[carrier] = { stats: processGroup(roundsForDepot.filter(g => g.carrier === carrier)) };
        });


        aggregatedStats[depot] = { stats: depotStats, byWarehouse, byCarrier };
    });

    for (const round of allRounds) {
      if(!round.nom || !round.date || !round.nomHub) continue;
      const roundKey = `${round.nom}-${new Date(round.date as string).toISOString().split('T')[0]}-${round.nomHub}`;
      const roundCapacity = round.capacitePoids;
      if (typeof roundCapacity === "number") {
        const totalWeight = tasksWeightByRound.get(roundKey) || 0;
        const isOverweight = totalWeight > roundCapacity;

        const depot = getDepotFromHub(round.nomHub);
        if (depot) {
            if (!depotAggregation[depot]) depotAggregation[depot] = { totalRounds: 0, overweightRounds: 0 };
            depotAggregation[depot].totalRounds++;
            if (isOverweight) depotAggregation[depot].overweightRounds++;
        }
        if (round.nomHub) {
            if (!warehouseAggregation[round.nomHub]) warehouseAggregation[round.nomHub] = { totalRounds: 0, overweightRounds: 0 };
            warehouseAggregation[round.nomHub].totalRounds++;
            if (isOverweight) warehouseAggregation[round.nomHub].overweightRounds++;
        }
        if (isOverweight) weightResults.push({ round, totalWeight, capacity: roundCapacity, deviation: totalWeight - roundCapacity });
      }

      const totalBacs = tasksBacsByRound.get(roundKey) || 0;
      if (totalBacs > BAC_LIMIT) bacResults.push({ round, totalBacs, deviation: totalBacs - BAC_LIMIT });
    }

    const calculateSummary = (aggregation: Record<string, any>): DeviationSummary[] => {
        return Object.entries(aggregation).map(([name, data]) => ({
            name,
            overloadRate: data.totalRounds > 0 ? (data.overweightRounds / data.totalRounds) * 100 : 0,
            totalRounds: data.totalRounds,
            overweightRounds: data.overweightRounds,
        })).sort((a, b) => b.overloadRate - a.overloadRate);
    }
    
    const punctualityResults: PunctualityIssue[] = [];
    allTasks.forEach(task => {
        if (task.heureArriveeEstimee && task.debutCreneauInitial) {
            try {
                const plannedArrive = parseISO(task.heureArriveeEstimee);
                const windowStart = parseISO(task.debutCreneauInitial);
                const earlyThreshold = subMinutes(windowStart, 15);
                const deviationEarly = differenceInMinutes(earlyThreshold, plannedArrive);
                if (deviationEarly > 0) {
                    punctualityResults.push({ task, plannedArriveTime: task.heureArriveeEstimee, deviationMinutes: -deviationEarly });
                } else if (task.finCreneauInitial) {
                    const windowEnd = parseISO(task.finCreneauInitial);
                    const lateThreshold = addMinutes(windowEnd, 15);
                    const deviationLate = differenceInMinutes(plannedArrive, lateThreshold);
                    if (deviationLate > 0) {
                        punctualityResults.push({ task, plannedArriveTime: task.heureArriveeEstimee, deviationMinutes: deviationLate });
                    }
                }
            } catch {}
        }
    });

    return {
        deviations: weightResults.sort((a, b) => b.deviation - a.deviation),
        depotSummary: calculateSummary(depotAggregation),
        warehouseSummary: calculateSummary(warehouseAggregation),
        punctualityIssues: punctualityResults.sort((a, b) => Math.abs(b.deviationMinutes) - Math.abs(a.deviationMinutes)),
        bacDeviations: bacResults.sort((a, b) => b.deviation - a.deviation),
        aggregatedStats
    };
  }, [allTasks, allRounds, isContextLoading, allCarrierRules]);

  const error = null;

  return (
    <main className="flex-1 container py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Analyse des Écarts & Ponctualité</h1>
      </div>

      {isContextLoading && (
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
            <p>Impossible de charger les données. Veuillez vérifier vos permissions et la configuration.</p>
            <pre className="mt-4 text-sm bg-background p-2 rounded">{(error as Error).message}</pre>
          </CardContent>
        </Card>
      )}

      {!isContextLoading && !error && (
        <div className="space-y-8">
            <Card>
                 <CardHeader>
                    <CardTitle>Analyse Synthétique par Dépôt</CardTitle>
                    <CardDescription>Comparaison des indicateurs de performance clés par dépôt.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AggregationAccordion data={aggregatedStats} title="Dépôt" icon={<Building />} />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DeviationSummaryCard title="Synthèse Surcharge par Dépôt" data={depotSummary} icon={<Building />} />
                <DeviationSummaryCard title="Synthèse Surcharge par Entrepôt" data={warehouseSummary} icon={<Warehouse />} />
            </div>

            <Tabs defaultValue="surcharge-poids">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="surcharge-poids">Surcharge Poids ({deviations.length})</TabsTrigger>
                <TabsTrigger value="surcharge-bacs">Surcharge Bacs ({bacDeviations.length})</TabsTrigger>
                <TabsTrigger value="ponctualite">Ponctualité ({punctualityIssues.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="surcharge-poids" className="mt-4">
                  <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Scale />Détail des Tournées en Surcharge de Poids</CardTitle>
                        <CardDescription>Liste des tournées dont le poids total des tâches dépasse la capacité maximale du véhicule assigné.</CardDescription>
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
                                <TableCell>{round.date ? format(new Date(round.date as string), "dd/MM/yyyy") : "N/A"}</TableCell>
                                <TableCell className="font-medium">{round.nom}</TableCell>
                                <TableCell>{round.nomHub || 'N/A'}</TableCell>
                                <TableCell>{getDriverFullName(round) || "N/A"}</TableCell>
                                <TableCell className="text-right font-mono">{totalWeight.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">{capacity.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono font-bold text-destructive">+{deviation.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        ) : (
                        <div className="text-center py-16 text-muted-foreground"><p>Aucune tournée en surcharge de poids détectée pour la période sélectionnée.</p></div>
                        )}
                    </CardContent>
                  </Card>
              </TabsContent>

              <TabsContent value="surcharge-bacs" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Box />Détail des Tournées en Surcharge de Bacs</CardTitle>
                        <CardDescription>Liste des tournées dont le nombre total de bacs (secs et frais) dépasse la limite de {BAC_LIMIT}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {bacDeviations.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Tournée</TableHead>
                                    <TableHead>Entrepôt</TableHead>
                                    <TableHead>Livreur</TableHead>
                                    <TableHead className="text-right">Bacs Calculés</TableHead>
                                    <TableHead className="text-right text-destructive">Ecart</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bacDeviations.map(({ round, totalBacs, deviation }) => (
                                    <TableRow key={round.id}>
                                        <TableCell>{round.date ? format(new Date(round.date as string), "dd/MM/yyyy") : "N/A"}</TableCell>
                                        <TableCell className="font-medium">{round.nom}</TableCell>
                                        <TableCell>{round.nomHub || 'N/A'}</TableCell>
                                        <TableCell>{getDriverFullName(round) || "N/A"}</TableCell>
                                        <TableCell className="text-right font-mono">{totalBacs}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-destructive">+{deviation}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        ) : (
                        <div className="text-center py-16 text-muted-foreground"><p>Aucune tournée en surcharge de bacs détectée pour la période sélectionnée.</p></div>
                        )}
                    </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ponctualite" className="mt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Clock />Analyse de Ponctualité Prévisionnelle</CardTitle>
                        <CardDescription>Liste des tâches dont l'heure d'arrivée planifiée est en dehors du créneau horaire promis au client (tolérance de +/- 15 min).</CardDescription>
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
                                <TableCell>{task.date ? format(new Date(task.date as string), "dd/MM/yyyy") : "N/A"}</TableCell>
                                <TableCell className="font-medium">{task.nomTournee}</TableCell>
                                <TableCell>{task.nomHub || 'N/A'}</TableCell>
                                <TableCell>{task.personneContact || 'N/A'}</TableCell>
                                <TableCell>{task.debutCreneauInitial ? format(new Date(task.debutCreneauInitial), "HH:mm") : ''}{task.finCreneauInitial ? ` - ${format(new Date(task.finCreneauInitial), "HH:mm")}`: ''}</TableCell>
                                <TableCell>{plannedArriveTime ? format(new Date(plannedArriveTime), "HH:mm") : 'N/A'}</TableCell>
                                <TableCell className={`text-right font-bold ${deviationMinutes > 0 ? 'text-destructive' : 'text-blue-500'}`}>{deviationMinutes > 0 ? `+${deviationMinutes}` : deviationMinutes} min</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        ) : (
                        <div className="text-center py-16 text-muted-foreground"><p>Aucun écart de ponctualité prévisionnel détecté pour la période sélectionnée.</p></div>
                        )}
                    </CardContent>
                 </Card>
              </TabsContent>
            </Tabs>
        </div>
      )}
    </main>
  );
}
