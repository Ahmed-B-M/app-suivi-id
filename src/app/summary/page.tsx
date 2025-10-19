
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
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, Building, ChevronDown, Clock, MapPin, Percent, TrendingDown, TrendingUp, Warehouse } from "lucide-react";
import type { Tache, Tournee } from "@/lib/types";
import { useFilterContext } from "@/context/filter-context";
import { getDepotFromHub } from "@/lib/grouping";
import { format, differenceInMinutes, parseISO, addMinutes, subMinutes, differenceInHours } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { calculateSummaryMetrics, SummaryMetrics } from "@/lib/stats-calculator";

const SummaryRow = ({ data, isSubRow = false }: { data: SummaryMetrics; isSubRow?: boolean }) => (
     <TableRow className={cn(!isSubRow && "bg-muted/50 font-semibold")}>
        <TableCell className="w-[15%]">
             <div className={cn("flex items-center gap-2", isSubRow && "pl-6")}>
                {isSubRow ? <Warehouse className="h-4 w-4 text-muted-foreground"/> : <Building className="h-4 w-4 text-muted-foreground"/>}
                {data.name}
            </div>
        </TableCell>
        <TableCell className="text-right w-[5%]">{data.totalRounds}</TableCell>
        <TableCell className="text-right font-mono w-[10%]">{data.punctualityRatePlanned != null ? `${data.punctualityRatePlanned.toFixed(1)}%` : 'N/A'}</TableCell>
        <TableCell className="text-right font-mono w-[10%]">{data.punctualityRateActual != null ? `${data.punctualityRateActual.toFixed(1)}%` : 'N/A'}</TableCell>
        <TableCell className="text-right font-mono w-[10%]">{data.overweightRoundsRate != null ? `${data.overweightRoundsRate.toFixed(1)}%` : 'N/A'}</TableCell>
        <TableCell className="w-[15%] px-2">
            <div className="flex flex-col text-xs">
                <div className="flex items-center gap-1 text-green-600"><TrendingUp className="h-3 w-3"/> {data.mostFrequentTimeWindow}</div>
                <div className="flex items-center gap-1 text-red-600"><TrendingDown className="h-3 w-3"/> {data.leastFrequentTimeWindow}</div>
            </div>
        </TableCell>
        <TableCell className="w-[10%] text-center">
             <Badge variant="destructive">{data.mostLateTimeWindow}</Badge>
        </TableCell>
        <TableCell className="w-[15%] px-2">
            <ol className="list-decimal list-inside text-xs">
                {data.top3LatePostcodes.map(pc => <li key={pc.postcode}>{pc.postcode} ({pc.count})</li>)}
                 {data.top3LatePostcodes.length === 0 && <li className="list-none">N/A</li>}
            </ol>
        </TableCell>
        <TableCell className="text-right font-mono w-[10%]">{data.avgTasksPer2Hours != null ? (isFinite(data.avgTasksPer2Hours) ? data.avgTasksPer2Hours.toFixed(1) : '∞') : 'N/A'}</TableCell>
    </TableRow>
);


export default function SummaryPage() {
  const { filteredTasks, filteredRounds, isLoading } = useFilterContext();

  const { depotSummary, warehouseSummaryByDepot } = useMemo(() => {
    if (!filteredTasks || !filteredRounds) {
      return { depotSummary: [], warehouseSummaryByDepot: new Map() };
    }
    return calculateSummaryMetrics(filteredTasks, filteredRounds);
  }, [filteredTasks, filteredRounds]);


  const error = null; // Assuming no error from context for now

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
                <Accordion type="multiple" className="w-full border rounded-lg">
                    {depotSummary.map(depotData => {
                        const warehouses = warehouseSummaryByDepot.get(depotData.name) || [];
                        return (
                            <AccordionItem key={depotData.name} value={depotData.name}>
                                <AccordionTrigger>
                                  <Table className="w-full">
                                    <TableBody>
                                      <SummaryRow data={depotData} />
                                    </TableBody>
                                  </Table>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="pl-6 pr-2 py-2 border-l-4 border-primary ml-2">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[15%]">Entrepôt</TableHead>
                                                    <TableHead className="text-right w-[5%]">Tournées</TableHead>
                                                    <TableHead className="text-right w-[10%]">Ponct. Prév.</TableHead>
                                                    <TableHead className="text-right w-[10%]">Ponct. Réal.</TableHead>
                                                    <TableHead className="text-right w-[10%]">Surcharge</TableHead>
                                                    <TableHead className="w-[15%] text-center">Fenêtres (Pop.)</TableHead>
                                                    <TableHead className="w-[10%] text-center">Fenêtre (Retards)</TableHead>
                                                    <TableHead className="w-[15%] text-center">Top 3 CP (Retards)</TableHead>
                                                    <TableHead className="text-right w-[10%]">Tâches / 2h</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {warehouses.map(whData => (
                                                    <SummaryRow key={whData.name} data={whData} isSubRow={true} />
                                                ))}
                                                {warehouses.length === 0 && (
                                                  <TableRow>
                                                    <TableCell colSpan={9} className="text-center text-muted-foreground italic py-4">
                                                        Aucun magasin/entrepôt rattaché à ce dépôt pour la période sélectionnée.
                                                    </TableCell>
                                                  </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
                {depotSummary.length === 0 && (
                    <div className="text-center text-muted-foreground py-8 border rounded-lg">
                        Aucune donnée à afficher pour la période sélectionnée.
                    </div>
                )}
            </CardContent>
        </Card>
      )}
    </main>
  );
}
