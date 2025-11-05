
"use client";

import { useState, useMemo } from "react";
import type { Tache, Tournee } from "@/lib/types";
import { useFilters } from "@/context/filter-context";
import { getCarrierFromDriver, getDepotFromHub } from "@/lib/grouping";
import { format, getDay, parseISO } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Euro, Truck, Wrench } from "lucide-react";
import { DepotPricingTab } from "@/components/app/billing/depot-pricing-tab";
import { StorePricingTab } from "@/components/app/billing/store-pricing-tab";
import { CostConfigTab } from "@/components/app/billing/cost-config-tab";
import { BillingDashboard, type AggregatedData } from "@/components/app/billing-dashboard";
import { UnassignedDriversAlert } from "@/components/app/unassigned-drivers-alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingPage() {
  const { allRounds, allTasks, allCarrierRules, allDepotRules, isContextLoading } = useFilters();
  
  // These would come from Firestore in a real app via the config tabs
  const depotPricing = {
    "Aix": { weekday: 150, sunday: 180 },
    "Vitry": { weekday: 160, sunday: 190 },
    "Rungis": { weekday: 155, sunday: 185 },
  };

  const costConfig = {
    "entrepot": { type: "tournee", cost: 120 },
    "magasin": { type: "jour", cost: 200 }
  };
  
  const aggregatedData: AggregatedData | null = useMemo(() => {
    if (isContextLoading) return null;

    const unassignedDrivers = new Set<string>();

    const details = allRounds.map(round => {
      const depot = getDepotFromHub(round.nomHub, allDepotRules);
      const store = depot === 'Magasin' ? round.nomHub : undefined;
      const carrier = getCarrierFromDriver(round, allCarrierRules);
      const driverName = getDriverFullName(round);
      
      if (carrier === "Inconnu" && driverName && driverName !== "Inconnu") {
        unassignedDrivers.add(driverName);
      }

      let price = 0;
      let cost = 0;

      if (store) {
        // Magasin pricing logic (to be implemented from rules)
        price = costConfig.magasin.cost * 1.2; // Dummy price
        cost = costConfig.magasin.cost;
      } else if (depot && depotPricing[depot as keyof typeof depotPricing]) {
        // Entrepot pricing logic
        const roundDate = parseISO(round.date as string);
        const isSunday = getDay(roundDate) === 0;
        price = isSunday ? depotPricing[depot as keyof typeof depotPricing].sunday : depotPricing[depot as keyof typeof depotPricing].weekday;
        cost = costConfig.entrepot.cost;
      }

      return { round, depot, store, carrier, price, cost };
    });

    const summary = details.reduce((acc, item) => {
        acc.totalPrice += item.price;
        acc.totalCost += item.cost;
        acc.totalRounds += 1;

        const entityKey = item.depot || 'Non Défini';
        acc.roundsByEntity[entityKey] = (acc.roundsByEntity[entityKey] || 0) + 1;
        
        const carrierKey = item.carrier || 'Inconnu';
        acc.roundsByCarrier[carrierKey] = (acc.roundsByCarrier[carrierKey] || 0) + 1;

        return acc;
    }, { 
        totalPrice: 0, 
        totalCost: 0, 
        margin: 0,
        totalRounds: 0, 
        averageMarginPerRound: 0,
        roundsByEntity: {} as Record<string, number>,
        roundsByCarrier: {} as Record<string, number>,
    });
    
    summary.margin = summary.totalPrice - summary.totalCost;
    summary.averageMarginPerRound = summary.totalRounds > 0 ? summary.margin / summary.totalRounds : 0;
    
    const aggregatedDetails = Object.values(details.reduce((acc, item) => {
        const entityKey = item.depot || 'Non Défini';
        const carrierKey = item.carrier || 'Inconnu';

        if (!acc[entityKey]) {
            acc[entityKey] = { name: entityKey, totalPrice: 0, totalCost: 0, totalRounds: 0, margin: 0, byCarrier: {} };
        }
        if (!acc[entityKey].byCarrier[carrierKey]) {
            acc[entityKey].byCarrier[carrierKey] = { name: carrierKey, totalPrice: 0, totalCost: 0, totalRounds: 0, margin: 0 };
        }

        acc[entityKey].totalPrice += item.price;
        acc[entityKey].totalCost += item.cost;
        acc[entityKey].totalRounds += 1;
        acc[entityKey].byCarrier[carrierKey].totalPrice += item.price;
        acc[entityKey].byCarrier[carrierKey].totalCost += item.cost;
        acc[entityKey].byCarrier[carrierKey].totalRounds += 1;

        return acc;
    }, {} as Record<string, any>)).map((entity: any) => {
        entity.margin = entity.totalPrice - entity.totalCost;
        entity.byCarrier = Object.values(entity.byCarrier).map((carrier: any) => {
            carrier.margin = carrier.totalPrice - carrier.totalCost;
            return carrier;
        }).sort((a,b) => b.totalRounds - a.totalRounds);
        return entity;
    }).sort((a,b) => b.totalRounds - a.totalRounds);


    return {
        summary: {
            ...summary,
            roundsByEntity: Object.entries(summary.roundsByEntity).sort((a, b) => b[1] - a[1]),
            roundsByCarrier: Object.entries(summary.roundsByCarrier).sort((a, b) => b[1] - a[1]),
            unassignedDrivers: Array.from(unassignedDrivers),
        },
        details: aggregatedDetails,
    };
  }, [allRounds, allTasks, allCarrierRules, allDepotRules, isContextLoading]);

  const handleExport = () => {
    // Export logic will be implemented here
  };


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Facturation & Analyse de Marge</h1>
      
      <Tabs defaultValue="dashboard">
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">
                <Euro className="mr-2" />
                Tableau de Bord
            </TabsTrigger>
            <TabsTrigger value="depot-pricing">
                <Truck className="mr-2" />
                Tarifs Entrepôts
            </TabsTrigger>
            <TabsTrigger value="store-pricing">
                <Wrench className="mr-2" />
                Règles Tarifs Magasins
            </TabsTrigger>
            <TabsTrigger value="cost-config">
                <Wrench className="mr-2" />
                Configuration des Coûts
            </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
            {isContextLoading && <Skeleton className="h-[500px] w-full" />}
            {aggregatedData && <BillingDashboard data={aggregatedData} onExport={handleExport} />}
            {aggregatedData?.summary.unassignedDrivers && aggregatedData.summary.unassignedDrivers.length > 0 && (
              <UnassignedDriversAlert unassignedDrivers={aggregatedData.summary.unassignedDrivers} />
            )}
        </TabsContent>
        <TabsContent value="depot-pricing" className="mt-4">
          <DepotPricingTab />
        </TabsContent>
         <TabsContent value="store-pricing" className="mt-4">
          <StorePricingTab />
        </TabsContent>
         <TabsContent value="cost-config" className="mt-4">
          <CostConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
