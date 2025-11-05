
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


interface ForecastTotals {
    total: number;
    matin: number;
    soir: number;
    bu: number;
    classique: number;
}

interface DepotForecast extends ForecastTotals {
    name: string;
}
interface CarrierForecast extends ForecastTotals {
    name: string;
}

interface GlobalForecast {
    totals: ForecastTotals;
    byDepot: DepotForecast[];
    byCarrier: CarrierForecast[];
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

const ForecastTable = ({ title, data, icon, nameHeader }: { title: string, data: (DepotForecast | CarrierForecast)[], icon: React.ReactNode, nameHeader: string }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-1/4">{nameHeader}</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">BU</TableHead>
                        <TableHead className="text-center">Classiques</TableHead>
                        <TableHead className="text-center">Matin</TableHead>
                        <TableHead className="text-center">Soir</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map(item => (
                        <TableRow key={item.name}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-center font-bold">{item.total}</TableCell>
                            <TableCell className="text-center font-mono">{item.bu}</TableCell>
                            <TableCell className="text-center font-mono">{item.classique}</TableCell>
                            <TableCell className="text-center font-mono">{item.matin}</TableCell>
                            <TableCell className="text-center font-mono">{item.soir}</TableCell>
                        </TableRow>
                    ))}
                    {data.length === 0 && (
                         <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                Aucune donnée de prévision à afficher.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

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
    
    const dataByDepot: Record<string, ForecastTotals> = {};
    const dataByCarrier: Record<string, ForecastTotals> = {};

    allRounds.forEach(round => {
      const depot = getDepotFromHub(round.nomHub, allDepotRules);
      const carrier = getCarrierFromDriver(round, allCarrierRules);
      
      const entities = [
          { name: depot, data: dataByDepot },
          { name: carrier, data: dataByCarrier }
      ];

      entities.forEach(({ name, data }) => {
          if (!name) return;
          if (!data[name]) {
            data[name] = { total: 0, matin: 0, soir: 0, bu: 0, classique: 0 };
          }
          const entityData = data[name];
          entityData.total++;
          
          const hubNameLower = round.nomHub?.toLowerCase() || '';
          let isTimeAssigned = false;
          for (const rule of timeRules) {
            if (rule.keywords.some(k => hubNameLower.includes(k.toLowerCase()))) {
              if (rule.category === 'Matin') entityData.matin++;
              else if (rule.category === 'Soir') entityData.soir++;
              isTimeAssigned = true;
              break; 
            }
          }

          let isBuAssigned = false;
          const roundNameLower = round.nom?.toLowerCase() || '';
          if (roundNameLower) {
              for (const rule of buRules) {
                  if (rule.keywords.some(k => roundNameLower.startsWith(k.toLowerCase()))) {
                      entityData.bu++;
                      isBuAssigned = true;
                      break;
                  }
              }
          }
          if (!isBuAssigned) {
              entityData.classique++;
          }
      });
    });

    const depotList = Object.entries(dataByDepot)
        .map(([name, totals]) => ({ name, ...totals }))
        .sort((a,b) => b.total - a.total);
    
    const carrierList = Object.entries(dataByCarrier)
        .map(([name, totals]) => ({ name, ...totals }))
        .sort((a,b) => b.total - a.total);

    const globalTotals = depotList.reduce((acc, depot) => {
        acc.total += depot.total;
        acc.matin += depot.matin;
        acc.soir += depot.soir;
        acc.bu += depot.bu;
        acc.classique += depot.classique;
        return acc;
    }, { total: 0, matin: 0, soir: 0, bu: 0, classique: 0 });

    return {
        totals: globalTotals,
        byDepot: depotList,
        byCarrier: carrierList
    };

  }, [allRounds, activeRules, isContextLoading, rulesLoading, allDepotRules, allCarrierRules]);
  
  if (!forecastData) {
      return <div className="flex-1 container py-8">Chargement des prévisions...</div>
  }

  return (
    <main className="flex-1 container py-8">
      <h1 className="text-3xl font-bold mb-8">Prévisions de Tournées</h1>

      <GlobalForecastSummary totals={forecastData.totals} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <ForecastTable title="Prévisions par Dépôt" data={forecastData.byDepot} icon={<Building />} nameHeader="Dépôt" />
        <ForecastTable title="Prévisions par Transporteur" data={forecastData.byCarrier} icon={<Truck />} nameHeader="Transporteur" />
      </div>

    </main>
  );
}
