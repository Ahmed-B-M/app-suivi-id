
"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Trash2 } from "lucide-react";
import { useFilters } from "@/context/filter-context";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Tache, Tournee } from "@/lib/types";
import { getHubCategory, getDepotFromHub, getCarrierFromDriver, getDriverFullName } from "@/lib/grouping";
import { BillingDashboard, type AggregatedData } from "@/components/app/billing-dashboard";
import { UnassignedDriversAlert } from "@/components/app/unassigned-drivers-alert";
import { exportToCsv } from "@/lib/csv-export";

export interface BillingRule {
  id: string;
  type: 'Prix par tournée' | 'Coût par tournée';
  targetType: 'Dépôt' | 'Entrepôt' | 'Transporteur';
  targetValue: string;
  price: number;
}


const billingRuleSchema = z.object({
  type: z.enum(["Prix par tournée", "Coût par tournée"]),
  targetType: z.enum(["Dépôt", "Entrepôt", "Transporteur"]),
  targetValue: z.string().min(1, "La cible est requise."),
  price: z.coerce.number().positive("Le prix doit être un nombre positif."),
});

type BillingRuleFormValues = z.infer<typeof billingRuleSchema>;

export default function BillingPage() {
  const [rules, setRules] = useState<BillingRule[]>([
    { id: "1", type: "Prix par tournée", targetType: "Dépôt", targetValue: "Aix", price: 15.50 },
    { id: "2", type: "Coût par tournée", targetType: "Transporteur", targetValue: "YEL'IN", price: 12.00 },
    { id: "3", type: "Prix par tournée", targetType: "Entrepôt", targetValue: "Rungis FRAIS", price: 20.00 },
  ]);

  const { allRounds: filteredRounds } = useFilters();


  const billingData = useMemo((): AggregatedData | null => {
    if (!filteredRounds) return null;

    let totalPrice = 0;
    let totalCost = 0;
    const unassignedDrivers = new Set<string>();

    const aggregation: Record<string, {
        totalPrice: number;
        totalCost: number;
        totalRounds: number;
        byCarrier: Record<string, {
            totalPrice: number;
            totalCost: number;
            totalRounds: number;
        }>;
    }> = {};

    for (const round of filteredRounds) {
      const driverName = getDriverFullName(round);
      const carrier = getCarrierFromDriver(driverName);
      const depot = getDepotFromHub(round.nomHub);
      const hubCategory = getHubCategory(round.nomHub);
      const entityName = hubCategory === 'magasin' ? round.nomHub : depot;

      if (!entityName) continue;

      if (carrier === 'Inconnu' && driverName) {
        unassignedDrivers.add(driverName);
      }

      const priceRule = rules.find(rule => 
        rule.type === 'Prix par tournée' &&
        ((rule.targetType === 'Dépôt' && rule.targetValue === depot) ||
         (rule.targetType === 'Entrepôt' && rule.targetValue === round.nomHub) ||
         (rule.targetType === 'Transporteur' && rule.targetValue === carrier))
      );

      const costRule = rules.find(rule => 
        rule.type === 'Coût par tournée' &&
        ((rule.targetType === 'Dépôt' && rule.targetValue === depot) ||
         (rule.targetType === 'Entrepôt' && rule.targetValue === round.nomHub) ||
         (rule.targetType === 'Transporteur' && rule.targetValue === carrier))
      );
      
      const price = priceRule?.price ?? 0;
      const cost = costRule?.price ?? 0;

      totalPrice += price;
      totalCost += cost;

      if (!aggregation[entityName]) {
        aggregation[entityName] = { totalPrice: 0, totalCost: 0, totalRounds: 0, byCarrier: {} };
      }
      if (!aggregation[entityName].byCarrier[carrier]) {
          aggregation[entityName].byCarrier[carrier] = { totalPrice: 0, totalCost: 0, totalRounds: 0 };
      }

      aggregation[entityName].totalPrice += price;
      aggregation[entityName].totalCost += cost;
      aggregation[entityName].totalRounds += 1;

      aggregation[entityName].byCarrier[carrier].totalPrice += price;
      aggregation[entityName].byCarrier[carrier].totalCost += cost;
      aggregation[entityName].byCarrier[carrier].totalRounds += 1;
    }
    
    const roundsByCarrier = Object.values(aggregation).reduce((acc, entity) => {
        Object.entries(entity.byCarrier).forEach(([carrierName, carrierData]) => {
            if (!acc[carrierName]) acc[carrierName] = 0;
            acc[carrierName] += carrierData.totalRounds;
        });
        return acc;
    }, {} as Record<string, number>);

    const totalRounds = filteredRounds.length;

    return {
      summary: {
        totalPrice,
        totalCost,
        margin: totalPrice - totalCost,
        totalRounds,
        averageMarginPerRound: totalRounds > 0 ? (totalPrice - totalCost) / totalRounds : 0,
        roundsByEntity: Object.entries(aggregation).map(([name, data]) => ([name, data.totalRounds])).sort((a,b) => b[1] - a[1]),
        roundsByCarrier: Object.entries(roundsByCarrier).sort((a,b) => b[1] - a[1]),
        unassignedDrivers: Array.from(unassignedDrivers),
      },
      details: Object.entries(aggregation).map(([entityName, entityData]) => ({
          name: entityName,
          ...entityData,
          margin: entityData.totalPrice - entityData.totalCost,
          byCarrier: Object.entries(entityData.byCarrier).map(([carrierName, carrierData]) => ({
              name: carrierName,
              ...carrierData,
              margin: carrierData.totalPrice - carrierData.totalCost
          })).sort((a,b) => b.totalRounds - a.totalRounds)
      })).sort((a,b) => b.totalRounds - a.totalRounds)
    };
  }, [filteredRounds, rules]);


  const form = useForm<BillingRuleFormValues>({
    resolver: zodResolver(billingRuleSchema),
    defaultValues: {
      type: "Prix par tournée",
      targetType: "Dépôt",
      targetValue: "",
      price: 0,
    },
  });

  function onSubmit(values: BillingRuleFormValues) {
    const newRule: BillingRule = {
      id: (rules.length + 1).toString(),
      type: values.type,
      targetType: values.targetType,
      targetValue: values.targetValue,
      price: values.price,
    };
    setRules([...rules, newRule]);
    form.reset();
  }

  function deleteRule(id: string) {
    setRules(rules.filter(rule => rule.id !== id));
  }

  function handleExport() {
    if (billingData) {
      // @ts-ignore - a refactor is needed to support this
      exportToCsv(billingData.details, 'facturation.csv');
    }
  }


  return (
    <main className="flex-1 container py-8">
      <h1 className="text-3xl font-bold mb-8">Module de Facturation</h1>
      
      {billingData && <BillingDashboard data={billingData} onExport={handleExport} />}
      
      {billingData?.summary.unassignedDrivers && billingData.summary.unassignedDrivers.length > 0 && (
          <UnassignedDriversAlert unassignedDrivers={billingData.summary.unassignedDrivers} />
      )}


      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une Règle</CardTitle>
              <CardDescription>
                Définissez les prix et les coûts pour vos tournées.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de Règle</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Prix par tournée">Prix par tournée</SelectItem>
                            <SelectItem value="Coût par tournée">Coût par tournée</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appliquer à</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une cible" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Dépôt">Dépôt</SelectItem>
                            <SelectItem value="Entrepôt">Entrepôt</SelectItem>
                            <SelectItem value="Transporteur">Transporteur</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de la Cible</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Aix, Rungis FRAIS, YEL'IN" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix / Coût (€)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ajouter la Règle
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Règles de Facturation Actives</CardTitle>
              <CardDescription>
                Liste des prix et coûts actuellement paramétrés.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Cible</TableHead>
                    <TableHead>Valeur Cible</TableHead>
                    <TableHead className="text-right">Prix / Coût</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.type}</TableCell>
                      <TableCell>{rule.targetType}</TableCell>
                      <TableCell>{rule.targetValue}</TableCell>
                      <TableCell className="text-right font-medium">{rule.price.toFixed(2)} €</TableCell>
                       <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                   {rules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          Aucune règle de facturation définie.
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
