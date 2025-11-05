
"use client";

import { useMemo } from "react";
import { useFilters } from "@/context/filter-context";
import { getDepotFromHub, getCarrierFromDriver } from "@/lib/grouping";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building, Truck, Sun, Moon, Boxes, BookOpen } from "lucide-react";
import { useQuery } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import type { ForecastRule } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface ForecastTotals {
    total: number;
    matin: number;
    soir: number;
    bu: number;
    classique: number;
}

interface CarrierForecast extends ForecastTotals {
    name: string;
}

interface DepotForecast {
    name: string;
    totals: ForecastTotals;
    byCarrier: CarrierForecast[];
}

interface GlobalForecast {
    totals: ForecastTotals;
    byDepot: DepotForecast[];
    byCarrier: CarrierForecast[];
}

const StatCard = ({ title, value, icon, cardClass }: { title: string, value: number, icon: React.ReactNode, cardClass?: string }) => (
    <Card className={cardClass}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-3xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const GlobalForecastSummary = ({ totals }: { totals: ForecastTotals }) => {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <StatCard title="Tournées Totales" value={totals.total} icon={<Truck className="h-5 w-5" />} cardClass="bg-blue-600/10 border-blue-600/20 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200" />
            <StatCard title="Tournées BU" value={totals.bu} icon={<Boxes className="h-5 w-5" />} cardClass="bg-purple-600/10 border-purple-600/20 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200" />
            <StatCard title="Tournées Classiques" value={totals.classique} icon={<BookOpen className="h-5 w-5" />} cardClass="bg-gray-600/10 border-gray-600/20 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200" />
            <StatCard title="Shift Matin" value={totals.matin} icon={<Sun className="h-5 w-5" />} cardClass="bg-amber-500/10 border-amber-500/20 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200" />
            <StatCard title="Shift Soir" value={totals.soir} icon={<Moon className="h-5 w-5" />} cardClass="bg-indigo-600/10 border-indigo-600/20 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-200" />
        </div>
    );
};

export default function ForecastPage() {
  const { allRounds, allDepotRules, allCarrierRules, isContextLoading } = useFilters();
  const { firestore } = useFirebase();

  const rulesCollection = useMemo(() => 
    firestore 
      ? query(collection(firestore, "forecast_rules"), where("isActive", "==", true))
      : null, 
    [firestore]
  );
  const { data: activeRules, loading: rulesLoading } = useQuery<ForecastRule>(rulesCollection, [], {realtime: true});

  const forecastData: GlobalForecast | null = useMemo(() => {
    if (isContextLoading || rulesLoading || !allRounds || !activeRules) return null;

    const timeRules = activeRules.filter(r => r.type === 'time');
    const buRules = activeRules.filter(r => r.type === 'type' && r.category === 'BU');
    
    const dataByDepot: Record<string, { totals: ForecastTotals; byCarrier: Record<string, ForecastTotals> }> = {};

    allRounds.forEach(round => {
      const depot = getDepotFromHub(round.nomHub, allDepotRules);
      const carrier = getCarrierFromDriver(round, allCarrierRules);
      
      if (!depot) return;

      if (!dataByDepot[depot]) {
        dataByDepot[depot] = { 
            totals: { total: 0, matin: 0, soir: 0, bu: 0, classique: 0 },
            byCarrier: {} 
        };
      }
      if (!dataByDepot[depot].byCarrier[carrier]) {
        dataByDepot[depot].byCarrier[carrier] = { total: 0, matin: 0, soir: 0, bu: 0, classique: 0 };
      }
      
      const depotTotals = dataByDepot[depot].totals;
      const carrierTotals = dataByDepot[depot].byCarrier[carrier];

      depotTotals.total++;
      carrierTotals.total++;

      const hubNameLower = round.nomHub?.toLowerCase() || '';
      timeRules.forEach(rule => {
        if (rule.keywords.some(k => hubNameLower.includes(k.toLowerCase()))) {
          if (rule.category === 'Matin') {
              depotTotals.matin++;
              carrierTotals.matin++;
          } else if (rule.category === 'Soir') {
              depotTotals.soir++;
              carrierTotals.soir++;
          }
        }
      });
      
      const roundNameLower = round.nom?.toLowerCase() || '';
      let isBuAssigned = false;
      if (roundNameLower) {
          for (const rule of buRules) {
              if (rule.keywords.some(k => roundNameLower.startsWith(k.toLowerCase()))) {
                  depotTotals.bu++;
                  carrierTotals.bu++;
                  isBuAssigned = true;
                  break;
              }
          }
      }
      
      if (!isBuAssigned) {
          depotTotals.classique++;
          carrierTotals.classique++;
      }
    });

    const depotList: DepotForecast[] = Object.entries(dataByDepot)
        .map(([name, data]) => ({
            name,
            totals: data.totals,
            byCarrier: Object.entries(data.byCarrier).map(([carrierName, totals]) => ({
                name: carrierName,
                ...totals
            })).sort((a,b) => b.total - a.total)
        }))
        .sort((a,b) => b.totals.total - a.totals.total);
    
    const globalTotals = depotList.reduce((acc, depot) => {
        acc.total += depot.totals.total;
        acc.matin += depot.totals.matin;
        acc.soir += depot.totals.soir;
        acc.bu += depot.totals.bu;
        acc.classique += depot.totals.classique;
        return acc;
    }, { total: 0, matin: 0, soir: 0, bu: 0, classique: 0 });

    const dataByCarrier = depotList.flatMap(d => d.byCarrier).reduce((acc, carrier) => {
        if (!acc[carrier.name]) {
            acc[carrier.name] = { total: 0, matin: 0, soir: 0, bu: 0, classique: 0 };
        }
        acc[carrier.name].total += carrier.total;
        acc[carrier.name].matin += carrier.matin;
        acc[carrier.name].soir += carrier.soir;
        acc[carrier.name].bu += carrier.bu;
        acc[carrier.name].classique += carrier.classique;
        return acc;
    }, {} as Record<string, ForecastTotals>);

    const carrierList = Object.entries(dataByCarrier).map(([name, totals]) => ({
        name,
        ...totals
    })).sort((a,b) => b.total - a.total);


    return {
        totals: globalTotals,
        byDepot: depotList,
        byCarrier: carrierList
    };

  }, [allRounds, activeRules, isContextLoading, rulesLoading, allDepotRules, allCarrierRules]);
  
  if (!forecastData) {
      return <div className="flex-1 container py-8">Chargement du FORECAST...</div>
  }

  return (
    <main className="flex-1 container py-8 space-y-8">
      <div className="flex flex-col items-start gap-2">
        <h1 className="text-3xl font-bold">FORECAST</h1>
        <p className="text-muted-foreground">
          Synthèse globale et détaillée des tournées prévisionnelles pour la période sélectionnée.
        </p>
      </div>

      <GlobalForecastSummary totals={forecastData.totals} />
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building /> FORECAST par Dépôt</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Dépôt</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">BU</TableHead>
                            <TableHead className="text-center">Classique</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {forecastData.byDepot.map(depot => (
                            <TableRow key={depot.name}>
                                <TableCell className="font-medium">{depot.name}</TableCell>
                                <TableCell className="text-center font-bold">{depot.totals.total}</TableCell>
                                <TableCell className="text-center font-mono text-purple-700">{depot.totals.bu}</TableCell>
                                <TableCell className="text-center font-mono text-gray-700">{depot.totals.classique}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Truck /> FORECAST par Transporteur</CardTitle>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Transporteur</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">BU</TableHead>
                            <TableHead className="text-center">Classique</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {forecastData.byCarrier.map(carrier => (
                            <TableRow key={carrier.name}>
                                <TableCell className="font-medium">{carrier.name}</TableCell>
                                <TableCell className="text-center font-bold">{carrier.total}</TableCell>
                                <TableCell className="text-center font-mono text-purple-700">{carrier.bu}</TableCell>
                                <TableCell className="text-center font-mono text-gray-700">{carrier.classique}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Détail par Dépôt et Transporteur</CardTitle>
            <CardDescription>Cliquez sur un dépôt pour voir le détail de ses transporteurs.</CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="multiple" className="w-full space-y-4">
                {forecastData.byDepot.map(depot => (
                    <AccordionItem value={depot.name} key={depot.name} className="border-b-0">
                        <Card>
                            <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                                <div className="w-full flex justify-between items-center">
                                    <span className="flex items-center gap-3"><Building />{depot.name}</span>
                                    <div className="flex items-center gap-2 text-base">
                                        <Badge variant="outline">Total: {depot.totals.total}</Badge>
                                        <Badge className="bg-purple-600/80 hover:bg-purple-600">BU: {depot.totals.bu}</Badge>
                                        <Badge className="bg-gray-600/80 hover:bg-gray-600">Classique: {depot.totals.classique}</Badge>
                                        <Badge className="bg-amber-500/80 hover:bg-amber-500">Matin: {depot.totals.matin}</Badge>
                                        <Badge className="bg-indigo-600/80 hover:bg-indigo-600">Soir: {depot.totals.soir}</Badge>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-0 pt-0">
                                <div className="p-4 bg-muted/50">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Transporteur</TableHead>
                                                <TableHead className="text-center">Total</TableHead>
                                                <TableHead className="text-center">BU</TableHead>
                                                <TableHead className="text-center">Classiques</TableHead>
                                                <TableHead className="text-center">Matin</TableHead>
                                                <TableHead className="text-center">Soir</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {depot.byCarrier.map(carrier => (
                                                <TableRow key={carrier.name}>
                                                    <TableCell className="font-medium flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground"/>{carrier.name}</TableCell>
                                                    <TableCell className="text-center font-bold">{carrier.total}</TableCell>
                                                    <TableCell className="text-center font-mono text-purple-700">{carrier.bu}</TableCell>
                                                    <TableCell className="text-center font-mono text-gray-700">{carrier.classique}</TableCell>
                                                    <TableCell className="text-center font-mono text-amber-700">{carrier.matin}</TableCell>
                                                    <TableCell className="text-center font-mono text-indigo-700">{carrier.soir}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                ))}
            </Accordion>
            {forecastData.byDepot.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                    Aucune donnée de FORECAST à afficher.
                </div>
            )}
        </CardContent>
      </Card>
    </main>
  );
}
