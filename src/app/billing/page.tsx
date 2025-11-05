
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Euro, Truck } from "lucide-react";
import { DepotPricingTab } from "@/components/app/billing/depot-pricing-tab";
import { StorePricingTab } from "@/components/app/billing/store-pricing-tab";

export default function BillingPage() {

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Configuration de la Facturation</h1>
      
      <Tabs defaultValue="depot-pricing">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="depot-pricing">
                <Truck className="mr-2" />
                Tarifs Entrepôts
            </TabsTrigger>
            <TabsTrigger value="store-pricing">
                 <Euro className="mr-2" />
                Tarifs Magasins
            </TabsTrigger>
        </TabsList>
        <TabsContent value="depot-pricing" className="mt-4">
          <DepotPricingTab />
        </TabsContent>
         <TabsContent value="store-pricing" className="mt-4">
          <StorePricingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
