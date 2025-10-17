
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
import { useFilterContext } from "@/context/filter-context";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Tache, Tournee } from "@/lib/types";
import { getHubCategory, getDepotFromHub } from "@/lib/grouping";

// Mock data for now - we will replace this with Firestore data later
const mockBillingRules = [
  { id: "1", type: "Prix par tournée", target: "Dépôt: Aix", price: "15.50" },
  { id: "2", type: "Coût par tournée", target: "Transporteur: YEL'IN", price: "12.00" },
  { id: "3", type: "Prix par tournée", target: "Entrepôt: Rungis FRAIS", price: "20.00" },
];

const billingRuleSchema = z.object({
  type: z.enum(["Prix par tournée", "Coût par tournée"]),
  targetType: z.enum(["Dépôt", "Entrepôt", "Transporteur"]),
  targetValue: z.string().min(1, "La cible est requise."),
  price: z.coerce.number().positive("Le prix doit être un nombre positif."),
});

type BillingRuleFormValues = z.infer<typeof billingRuleSchema>;

export default function BillingPage() {
  const [rules, setRules] = useState(mockBillingRules);
  const { firestore } = useFirebase();
  const { dateRange, filterType, selectedDepot, selectedStore } = useFilterContext();

  const tasksCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "tasks");
  }, [firestore]);

  const roundsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "rounds");
  }, [firestore]);

  const { data: tasks } = useCollection<Tache>(tasksCollection);
  const { data: rounds } = useCollection<Tournee>(roundsCollection);

  const filteredData = useMemo(() => {
    const { from, to } = dateRange || {};

    let filteredTasks = tasks || [];
    let filteredRounds = rounds || [];

    // Filter by date
    if (from) {
      const startOfDay = new Date(from);
      startOfDay.setHours(0,0,0,0);
      
      const endOfDay = to ? new Date(to) : new Date(from);
      endOfDay.setHours(23,59,59,999);
      
      const filterByDate = (item: Tache | Tournee) => {
        const itemDateString = item.date || item.dateCreation;
        if (!itemDateString) return false;
        const itemDate = new Date(itemDateString);
        return itemDate >= startOfDay && itemDate <= endOfDay;
      };

      filteredTasks = filteredTasks.filter(filterByDate);
      filteredRounds = filteredRounds.filter(filterByDate);
    }
    
    // Filter by type (depot/magasin)
    if (filterType !== 'tous') {
        const filterLogic = (item: Tache | Tournee) => getHubCategory(item.nomHub) === filterType;
        filteredTasks = filteredTasks.filter(filterLogic);
        filteredRounds = filteredRounds.filter(filterLogic);
    }

    // Filter by specific depot
    if (selectedDepot !== "all") {
      const filterLogic = (item: Tache | Tournee) => getDepotFromHub(item.nomHub) === selectedDepot;
      filteredTasks = filteredTasks.filter(filterLogic);
      filteredRounds = filteredRounds.filter(filterLogic);
    }
    
    // Filter by specific store
    if (selectedStore !== "all") {
      const filterLogic = (item: Tache | Tournee) => item.nomHub === selectedStore;
      filteredTasks = filteredTasks.filter(filterLogic);
      filteredRounds = filteredRounds.filter(filterLogic);
    }

    return { tasks: filteredTasks, rounds: filteredRounds };
  }, [tasks, rounds, dateRange, filterType, selectedDepot, selectedStore]);


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
    const newRule = {
      id: (rules.length + 1).toString(),
      type: values.type,
      target: `${values.targetType}: ${values.targetValue}`,
      price: values.price.toFixed(2),
    };
    setRules([...rules, newRule]);
    form.reset();
  }

  function deleteRule(id: string) {
    setRules(rules.filter(rule => rule.id !== id));
  }

  // You can use filteredData.rounds for billing calculations
  // For example:
  const totalRounds = filteredData.rounds.length;

  return (
    <main className="flex-1 container py-8">
      <h1 className="text-3xl font-bold mb-8">Module de Facturation</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Données Actuelles</CardTitle>
          <CardDescription>Données filtrées pour la facturation basées sur les filtres globaux.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Nombre de tournées correspondant aux filtres : <span className="font-bold text-2xl">{totalRounds}</span></p>
        </CardContent>
      </Card>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                    <TableHead className="text-right">Prix / Coût</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.type}</TableCell>
                      <TableCell>{rule.target}</TableCell>
                      <TableCell className="text-right font-medium">{rule.price} €</TableCell>
                       <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                   {rules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
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
