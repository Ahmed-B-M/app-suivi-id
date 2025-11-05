
"use client";

import { useMemo } from "react";
import { useFilters } from "@/context/filter-context";
import { getDepotFromHub, getCarrierFromDriver } from "@/lib/grouping";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building, Truck, TrendingUp, Sun, Moon, Boxes, BookOpen } from "lucide-react";
import { useQuery } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import type { ForecastRule, Tournee } from "@/lib/types";
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
}


const StatCard = ({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const GlobalForecastSummary = ({ totals }: { totals: ForecastTotals }) => {
    return (
        <Card className="mb-8">
            <CardHeader>
                <CardTitle>Synthèse Globale</CardTitle>
                <CardDescription>Aperçu de toutes les tournées prévisionnelles pour la période sélectionnée.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard title="Tournées Totales" value={totals.total} icon={<Truck className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Tournées BU" value={totals.bu} icon={<Boxes className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Tournées Classiques" value={totals.classique} icon={<BookOpen className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Shift Matin" value={totals.matin} icon={<Sun className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Shift Soir" value={totals.soir} icon={<Moon className="h-4 w-4 text-muted-foreground" />} />
            </CardContent>
        </Card>
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
      let isTimeAssigned = false;
      for (const rule of timeRules) {
        if (rule.keywords.some(k => hubNameLower.includes(k.toLowerCase()))) {
          if (rule.category === 'Matin') {
              depotTotals.matin++;
              carrierTotals.matin++;
          } else if (rule.category === 'Soir') {
              depotTotals.soir++;
              carrierTotals.soir++;
          }
          isTimeAssigned = true;
          break; 
        }
      }

      let isBuAssigned = false;
      const roundNameLower = round.nom?.toLowerCase() || '';
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

    return {
        totals: globalTotals,
        byDepot: depotList,
    };

  }, [allRounds, activeRules, isContextLoading, rulesLoading, allDepotRules, allCarrierRules]);
  
  if (!forecastData) {
      return <div className="flex-1 container py-8">Chargement des prévisions...</div>
  }

  return (
    <main className="flex-1 container py-8">
      <h1 className="text-3xl font-bold mb-8">Prévisions de Tournées</h1>

      <GlobalForecastSummary totals={forecastData.totals} />

      <Card>
        <CardHeader>
            <CardTitle>Prévisions par Dépôt et Transporteur</CardTitle>
        </CardHeader>
        <CardContent>
             <Accordion type="multiple" className="w-full space-y-4">
                {forecastData.byDepot.map(depot => (
                     <AccordionItem value={depot.name} key={depot.name} className="border-b-0">
                         <Card>
                            <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                                <div className="w-full flex justify-between items-center">
                                    <span className="flex items-center gap-3"><Building />{depot.name}</span>
                                    <div className="flex items-center gap-4 text-sm">
                                        <Badge variant="outline">Total: {depot.totals.total}</Badge>
                                        <Badge>BU: {depot.totals.bu}</Badge>
                                        <Badge variant="secondary">Classiques: {depot.totals.classique}</Badge>
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
                                                    <TableCell className="text-center font-mono">{carrier.bu}</TableCell>
                                                    <TableCell className="text-center font-mono">{carrier.classique}</TableCell>
                                                    <TableCell className="text-center font-mono">{carrier.matin}</TableCell>
                                                    <TableCell className="text-center font-mono">{carrier.soir}</TableCell>
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
                    Aucune donnée de prévision à afficher.
                </div>
            )}
        </CardContent>
      </Card>

    </main>
  );
}
