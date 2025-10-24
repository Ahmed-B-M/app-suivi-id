
"use client";

import { useState, useMemo, useEffect } from "react";
import { useFilters } from "@/context/filter-context";
import { getDepotFromHub, getCarrierFromDriver } from "@/lib/grouping";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building, Truck } from "lucide-react";
import { useCollection } from "@/firebase";
import { collection } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import type { ForecastRule } from "@/lib/types";


export default function ForecastPage() {
  const { allRounds } = useFilters();
  const { firestore } = useFirebase();

  const rulesCollection = useMemo(() => 
    firestore ? collection(firestore, "forecast_rules") : null, 
    [firestore]
  );
  const { data: rules, loading: rulesLoading } = useCollection<ForecastRule>(rulesCollection);


  const forecastData = useMemo(() => {
    if (!allRounds || rulesLoading || !rules) return {};

    const activeRules = rules.filter(r => r.isActive);
    const timeRules = activeRules.filter(r => r.type === 'time');
    const typeRules = activeRules.filter(r => r.type === 'type');

    const dataByDepot: Record<string, {
      total: number;
      carriers: Record<string, {
        total: number;
        matin: number;
        soir: number;
        bu: number;
        classique: number;
      }>
    }> = {};

    allRounds.forEach(round => {
      const depot = getDepotFromHub(round.nomHub);
      if (!depot) return;

      const carrier = getCarrierFromDriver(round) || 'Inconnu';
      
      if (!dataByDepot[depot]) {
        dataByDepot[depot] = { total: 0, carriers: {} };
      }
      if (!dataByDepot[depot].carriers[carrier]) {
        dataByDepot[depot].carriers[carrier] = { total: 0, matin: 0, soir: 0, bu: 0, classique: 0 };
      }

      dataByDepot[depot].total++;
      dataByDepot[depot].carriers[carrier].total++;
      
      let isTimeAssigned = false;
      for (const rule of timeRules) {
        if (round.nomHub && Array.isArray(rule.keywords) && rule.keywords.some(k => round.nomHub!.toLowerCase().includes(k.toLowerCase()))) {
          if (rule.category === 'Matin') dataByDepot[depot].carriers[carrier].matin++;
          else if (rule.category === 'Soir') dataByDepot[depot].carriers[carrier].soir++;
          isTimeAssigned = true;
          break;
        }
      }

      let isTypeAssigned = false;
      for (const rule of typeRules) {
        if (round.name && Array.isArray(rule.keywords) && rule.keywords.some(k => round.name!.toLowerCase().startsWith(k.toLowerCase()))) {
          if (rule.category === 'BU') dataByDepot[depot].carriers[carrier].bu++;
          isTypeAssigned = true;
          break;
        }
      }

      // If no type rule matched, it's a "Classique"
      if (!isTypeAssigned) {
        dataByDepot[depot].carriers[carrier].classique++;
      }
    });

    return dataByDepot;
  }, [allRounds, rules, rulesLoading]);
  
  return (
    <main className="flex-1 container py-8">
      <h1 className="text-3xl font-bold mb-8">Prévisions de Tournées</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Prévisions par Dépôt et Transporteur</CardTitle>
          <CardDescription>Analyse quantitative des tournées prévisionnelles basée sur les règles d'affectation.</CardDescription>
        </CardHeader>
        <CardContent>
           <Accordion type="multiple" className="w-full space-y-4">
            {Object.entries(forecastData).sort((a,b) => b[1].total - a[1].total).map(([depot, data]) => (
                <AccordionItem value={depot} key={depot} className="border-b-0">
                    <Card>
                        <AccordionTrigger className="p-4 hover:no-underline text-lg">
                            <div className="w-full flex justify-between items-center font-semibold">
                                <span className="flex items-center gap-3"><Building />{depot}</span>
                                <Badge variant="outline">{data.total} tournées</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0 pt-0">
                           <div className="p-4 bg-muted/50">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-1/4">Transporteur</TableHead>
                                        <TableHead className="text-center">Total</TableHead>
                                        <TableHead className="text-center">Matin</TableHead>
                                        <TableHead className="text-center">Soir</TableHead>
                                        <TableHead className="text-center">BU</TableHead>
                                        <TableHead className="text-center">Classiques</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(data.carriers).sort((a,b) => b[1].total - a[1].total).map(([carrier, carrierData]) => (
                                        <TableRow key={carrier}>
                                            <TableCell className="font-medium flex items-center gap-2"><Truck className="text-muted-foreground"/>{carrier}</TableCell>
                                            <TableCell className="text-center font-bold">{carrierData.total}</TableCell>
                                            <TableCell className="text-center font-mono">{carrierData.matin}</TableCell>
                                            <TableCell className="text-center font-mono">{carrierData.soir}</TableCell>
                                            <TableCell className="text-center font-mono">{carrierData.bu}</TableCell>
                                            <TableCell className="text-center font-mono">{carrierData.classique}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                           </div>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            ))}
             {Object.keys(forecastData).length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                    Aucune donnée de tournée à afficher pour la période sélectionnée.
                </div>
            )}
           </Accordion>
        </CardContent>
      </Card>
    </main>
  );
}
