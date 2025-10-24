
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
import { PlusCircle, Trash2, Building, Truck } from "lucide-react";
import { useFilters } from "@/context/filter-context";
import { getDepotFromHub, getCarrierFromDriver } from "@/lib/grouping";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export interface ForecastRule {
  id: string;
  name: string;
  type: 'time' | 'type';
  keywords: string[];
  category: 'Matin' | 'Soir' | 'BU' | 'Classique';
  isActive: boolean;
}

const forecastRuleSchema = z.object({
    name: z.string().min(1, "Le nom est requis."),
    type: z.enum(["time", "type"]),
    keywords: z.string().min(1, "Au moins un mot-clé est requis."),
    category: z.enum(['Matin', 'Soir', 'BU', 'Classique']),
});

type ForecastRuleFormValues = z.infer<typeof forecastRuleSchema>;


export default function ForecastPage() {
  const [rules, setRules] = useState<ForecastRule[]>([
    { id: "1", name: "Tournées du matin", type: 'time', keywords: ['matin', 'midi'], category: 'Matin', isActive: true },
    { id: "2", name: "Tournées du soir", type: 'time', keywords: ['soir', 'j'], category: 'Soir', isActive: true },
    { id: "3", name: "Tournées BU", type: 'type', keywords: ['R'], category: 'BU', isActive: true },
  ]);

  const { allRounds } = useFilters();

  const forecastData = useMemo(() => {
    if (!allRounds) return {};

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

      // Time classification
      let isTimeAssigned = false;
      for (const rule of timeRules) {
        if (round.nomHub && rule.keywords.some(k => round.nomHub!.toLowerCase().includes(k))) {
          if (rule.category === 'Matin') dataByDepot[depot].carriers[carrier].matin++;
          else if (rule.category === 'Soir') dataByDepot[depot].carriers[carrier].soir++;
          isTimeAssigned = true;
          break;
        }
      }

      // Type classification
      let isTypeAssigned = false;
      for (const rule of typeRules) {
        if (round.name && rule.keywords.some(k => round.name!.startsWith(k))) {
          if (rule.category === 'BU') dataByDepot[depot].carriers[carrier].bu++;
          isTypeAssigned = true;
          break;
        }
      }
      if (!isTypeAssigned) {
        dataByDepot[depot].carriers[carrier].classique++;
      }
    });

    return dataByDepot;
  }, [allRounds, rules]);
  
  const form = useForm<ForecastRuleFormValues>({
    resolver: zodResolver(forecastRuleSchema),
    defaultValues: {
      name: "",
      type: "time",
      keywords: "",
      category: "Matin",
    },
  });

  function onSubmit(values: ForecastRuleFormValues) {
    const newRule: ForecastRule = {
      id: (rules.length + 1).toString(),
      name: values.name,
      type: values.type,
      keywords: values.keywords.split(',').map(k => k.trim()),
      category: values.category,
      isActive: true,
    };
    setRules([...rules, newRule]);
    form.reset();
  }

  function toggleRule(id: string) {
    setRules(rules.map(rule => rule.id === id ? { ...rule, isActive: !rule.isActive } : rule));
  }

  function deleteRule(id: string) {
    setRules(rules.filter(rule => rule.id !== id));
  }

  return (
    <main className="flex-1 container py-8">
      <h1 className="text-3xl font-bold mb-8">Prévisions de Tournées</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Prévisions par Dépôt et Transporteur</CardTitle>
          <CardDescription>Analyse quantitative des tournées prévisionnelles.</CardDescription>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une Règle</CardTitle>
              <CardDescription>
                Créez de nouvelles règles de classification (non fonctionnel).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                   <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nom de la règle</FormLabel><FormControl><Input placeholder="Ex: Tournées du matin" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                            <SelectItem value="time">Temps (basé sur nom entrepôt)</SelectItem>
                            <SelectItem value="type">Type (basé sur nom tournée)</SelectItem>
                        </SelectContent></Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="keywords" render={({ field }) => (
                      <FormItem><FormLabel>Mots-clés (séparés par virgule)</FormLabel><FormControl><Input placeholder="matin, midi" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem><FormLabel>Catégorie assignée</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                            <SelectItem value="Matin">Matin</SelectItem>
                            <SelectItem value="Soir">Soir</SelectItem>
                             <SelectItem value="BU">BU</SelectItem>
                            <SelectItem value="Classique">Classique</SelectItem>
                        </SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  <Button type="submit" className="w-full" disabled>
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
              <CardTitle>Règles de Prévision Actives</CardTitle>
              <CardDescription>
                Activez ou désactivez les règles de classification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Mots-clés</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell><Badge variant="secondary">{rule.keywords.join(', ')}</Badge></TableCell>
                      <TableCell><Badge>{rule.category}</Badge></TableCell>
                      <TableCell className="text-center">
                        <Switch checked={rule.isActive} onCheckedChange={() => toggleRule(rule.id)} aria-label="Activer/Désactiver la règle" />
                      </TableCell>
                       <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)} disabled>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
