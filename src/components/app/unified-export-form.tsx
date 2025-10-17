"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Download,
  Loader2,
  Rocket,
  RotateCcw,
  Save,
} from "lucide-react";
import {
  writeBatch,
  collection,
  doc,
  getDocs,
} from "firebase/firestore";

import { unifiedExportFormSchema, type UnifiedExportFormValues } from "@/lib/schemas";
import { runUnifiedExportAction } from "@/app/actions";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useFirebase } from "@/firebase";
import { Tache, Tournee } from "@/lib/types";
import { DateRange } from "react-day-picker";

type UnifiedExportFormProps = {
  onExportStart: () => void;
  onExportComplete: (logs: string[], data: { tasks: Tache[], rounds: Tournee[] } | null) => void;
  onReset: () => void;
  onLogUpdate: (logs: string[]) => void;
  onSavingChange: (isSaving: boolean) => void;
  taskJsonData: Tache[] | null;
  roundJsonData: Tournee[] | null;
  isExporting: boolean;
  isSaving: boolean;
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export function UnifiedExportForm({
  onExportStart,
  onExportComplete,
  onReset,
  onLogUpdate,
  onSavingChange,
  taskJsonData,
  roundJsonData,
  isExporting,
  isSaving,
}: UnifiedExportFormProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const form = useForm<UnifiedExportFormValues>({
    resolver: zodResolver(unifiedExportFormSchema),
    defaultValues: {
      apiKey: "P_q6uTM746JQlmFpewz3ZS0cDV0tT8UEXk",
      dateRange: {
        from: new Date(),
        to: new Date(),
      },
      taskStatus: "all",
      roundStatus: "all",
      taskId: "",
      roundId: "",
      unplanned: false,
    },
  });

  const onSubmit = async (values: UnifiedExportFormValues) => {
    onExportStart();
    const result = await runUnifiedExportAction(values);
    onExportComplete(result.logs, result.data);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Échec de l'exportation",
        description: result.error,
      });
    }
  };

  const handleDownload = (type: 'tasks' | 'rounds') => {
    const data = type === 'tasks' ? taskJsonData : roundJsonData;
    if (!data) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `donnees_urbantz_${type}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleSaveToFirestore = async () => {
    if ((!taskJsonData || taskJsonData.length === 0) && (!roundJsonData || roundJsonData.length === 0)) {
        toast({ title: "Aucune donnée", description: "Aucune donnée à sauvegarder.", variant: "destructive" });
        return;
    }
    if (!firestore) {
      toast({ title: "Erreur", description: "La base de données n'est pas disponible.", variant: "destructive" });
      return;
    }

    onSavingChange(true);
    onLogUpdate([`\n💾 Début de la sauvegarde dans Firestore...`]);

    let anyError = false;

    if (taskJsonData && taskJsonData.length > 0) {
        await saveCollection('tasks', taskJsonData, 'tacheId', 'dateMiseAJour');
    }
    if (roundJsonData && roundJsonData.length > 0) {
        await saveCollection('rounds', roundJsonData, 'id', 'updated');
    }

    onSavingChange(false);

    if(!anyError) {
        onLogUpdate([`\n🎉 Sauvegarde terminée !`]);
        toast({ title: "Succès", description: "Les données ont été sauvegardées dans Firestore." });
    } else {
        onLogUpdate([`\n❌ Sauvegarde terminée avec des erreurs.`]);
        toast({ title: "Erreur", description: "Certaines données n'ont pas pu être sauvegardées.", variant: "destructive" });
    }


    async function saveCollection(collectionName: 'tasks' | 'rounds', data: any[], idKey: string, dateKey: string) {
        onLogUpdate([`\n   -> Sauvegarde de ${data.length} ${collectionName}...`]);
        const collectionRef = collection(firestore, collectionName);
        let itemsToSave = [];

        try {
            onLogUpdate(["      - Récupération des documents existants pour comparaison..."]);
            const existingDocsSnapshot = await getDocs(collectionRef);
            const existingDocsMap = new Map();
            existingDocsSnapshot.forEach(doc => {
                existingDocsMap.set(doc.id, doc.data()[dateKey]);
            });
            onLogUpdate([`      - ${existingDocsMap.size} documents existants trouvés.`]);

            for (const item of data) {
                const docId = item[idKey];
                if (!docId) continue;
                const existingTimestamp = existingDocsMap.get(docId.toString());
                const newTimestamp = item[dateKey];
                if (!existingTimestamp || (newTimestamp && new Date(newTimestamp) > new Date(existingTimestamp))) {
                    itemsToSave.push(item);
                }
            }
            onLogUpdate([`      - ${itemsToSave.length} nouveaux éléments ou éléments mis à jour à sauvegarder.`]);
        } catch (e) {
            const errorMsg = "      - ❌ Erreur lors de la récupération des données existantes.";
            onLogUpdate([errorMsg, e instanceof Error ? e.message : "Erreur inconnue"]);
            anyError = true;
            return;
        }

        if (itemsToSave.length === 0) {
            onLogUpdate(["      - ✅ Aucune nouvelle donnée à sauvegarder."]);
            return;
        }

        const batchSize = 450;
        for (let i = 0; i < itemsToSave.length; i += batchSize) {
            const chunk = itemsToSave.slice(i, i + batchSize);
            const currentBatchIndex = (i / batchSize) + 1;
            onLogUpdate([`      - Traitement du lot ${currentBatchIndex}...`]);
            try {
                const batch = writeBatch(firestore);
                chunk.forEach((item) => {
                    const docId = item[idKey];
                    if (docId) batch.set(doc(collectionRef, docId.toString()), item, { merge: true });
                });
                await batch.commit();
                onLogUpdate([`      - Lot de ${chunk.length} ${collectionName} sauvegardé avec succès.`]);
                await delay(100);
            } catch (e) {
                const errorMsg = `      - ❌ Erreur lors de la sauvegarde du lot de ${collectionName}.`;
                onLogUpdate([errorMsg, e instanceof Error ? e.message : "Erreur inconnue"]);
                anyError = true;
            }
        }
    }
  };


  const handleResetClick = () => {
    form.reset();
    onReset();
  }

  const isLoading = isExporting || isSaving;
  const hasData = (taskJsonData && taskJsonData.length > 0) || (roundJsonData && roundJsonData.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration de l'Export</CardTitle>
        <CardDescription>
          Configurez et lancez l'exportation unifiée des tâches et tournées depuis l'API Urbantz.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clé d'API Urbantz</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Votre clé d'API" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Période</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          id="date"
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !field.value?.from && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value?.from ? (
                            field.value.to ? (
                              <>
                                {format(field.value.from, "LLL dd, y")} -{" "}
                                {format(field.value.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(field.value.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Choisir une période</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={field.value?.from}
                        selected={field.value}
                        onSelect={field.onChange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="taskStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut des tâches</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un statut" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="COMPLETED">Terminée</SelectItem>
                        <SelectItem value="ONGOING">En cours</SelectItem>
                        <SelectItem value="ASSIGNED">Assignée</SelectItem>
                        <SelectItem value="UNPLANNED">Non planifiée</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roundStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut des tournées</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un statut" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="CREATED">Créée</SelectItem>
                        <SelectItem value="VALIDATED">Validée</SelectItem>
                        <SelectItem value="PUBLISHED">Publiée</SelectItem>
                        <SelectItem value="ONGOING">En cours</SelectItem>
                        <SelectItem value="ASSIGNED">Assignée</SelectItem>
                        <SelectItem value="IN_PREPARATION">En préparation</SelectItem>
                        <SelectItem value="COMPLETED">Terminée</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="taskId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID de tâche (optionnel)</FormLabel>
                    <FormControl><Input placeholder="Filtrer par ID de tâche" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roundId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID de tournée (optionnel)</FormLabel>
                    <FormControl><Input placeholder="Filtrer par ID de tournée" {...field} /></FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="unplanned"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Inclure les tâches non planifiées</FormLabel>
                    <FormDescription>Si coché, récupère les tâches sans date assignée.</FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2">
            <Button type="submit" disabled={isLoading}>
              {isExporting ? <Loader2 className="animate-spin" /> : <Rocket />}
              {isExporting ? "Export en cours..." : "Lancer l'Export"}
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleResetClick} disabled={isLoading}>
                <RotateCcw/>Réinitialiser
              </Button>
              <Button type="button" onClick={handleSaveToFirestore} disabled={!hasData || isLoading}>
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                {isSaving ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
              <Button type="button" onClick={() => handleDownload('tasks')} disabled={!taskJsonData || taskJsonData.length === 0}>
                <Download />Tâches
              </Button>
              <Button type="button" onClick={() => handleDownload('rounds')} disabled={!roundJsonData || roundJsonData.length === 0}>
                <Download />Tournées
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
