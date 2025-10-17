
"use client";

import { useState, useEffect } from "react";
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
  query,
  where,
  documentId,
} from "firebase/firestore";
import equal = require("deep-equal");

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
import { useFirebase, useUser, errorEmitter, FirestorePermissionError } from "@/firebase";
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
  const { isUserLoading } = useUser();

  const form = useForm<UnifiedExportFormValues>({
    resolver: zodResolver(unifiedExportFormSchema),
    defaultValues: {
      apiKey: "P_q6uTM746JQlmFpewz3ZS0cDV0tT8UEXk",
      dateRange: undefined,
      taskStatus: "all",
      roundStatus: "all",
      taskId: "",
      roundId: "",
      unplanned: false,
    },
  });

  useEffect(() => {
    // Set default date range on the client to avoid hydration mismatch
    form.setValue("dateRange", {
      from: new Date(),
      to: new Date(),
    });
  }, [form]);


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
    const jsonString = `data:text/json;charset=utf-t,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `donnees_urbantz_${type}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleSaveToFirestore = () => {
    if ((!taskJsonData || taskJsonData.length === 0) && (!roundJsonData || roundJsonData.length === 0)) {
        toast({ title: "Aucune donnée", description: "Aucune donnée à sauvegarder.", variant: "destructive" });
        return;
    }
    if (!firestore) {
      toast({ title: "Erreur", description: "La base de données n'est pas disponible.", variant: "destructive" });
      return;
    }

    toast({
      title: "Lancement de la sauvegarde",
      description: "La sauvegarde des données dans Firestore a commencé en arrière-plan.",
    });

    // Run the save operation asynchronously
    saveData().then(anyError => {
        if (!anyError) {
            onLogUpdate([`\n🎉 Sauvegarde terminée !`]);
            toast({ title: "Succès", description: "Les données ont été synchronisées avec Firestore." });
        } else {
            onLogUpdate([`\n❌ Sauvegarde terminée avec des erreurs.`]);
             toast({ title: "Erreurs de Sauvegarde", description: "Certaines données n'ont pas pu être sauvegardées. Vérifiez les logs.", variant: "destructive" });
        }
    });

    async function saveData() {
        onSavingChange(true);
        onLogUpdate([`\n💾 Début de la sauvegarde intelligente dans Firestore...`]);

        let anyError = false;

        if (taskJsonData && taskJsonData.length > 0) {
            anyError = !(await saveCollection('tasks', taskJsonData, 'tacheId')) || anyError;
        }
        if (roundJsonData && roundJsonData.length > 0) {
            anyError = !(await saveCollection('rounds', roundJsonData, 'id')) || anyError;
        }

        onSavingChange(false);
        return anyError;
    }


    async function saveCollection(collectionName: 'tasks' | 'rounds', data: any[], idKey: string): Promise<boolean> {
        onLogUpdate([`\n   -> Analyse de ${data.length} ${collectionName}...`]);
        const collectionRef = collection(firestore, collectionName);
        let success = true;
        
        const itemsWithId = data.filter(item => item[idKey]);
        const itemIds = itemsWithId.map(item => item[idKey].toString());

        if (itemIds.length === 0) {
            onLogUpdate([`      - ✅ Aucun document avec un ID valide à analyser.`]);
            return true;
        }

        // Fetch existing documents from Firestore for comparison
        onLogUpdate([`      - Récupération de ${itemIds.length} document(s) existant(s) pour comparaison...`]);
        const existingDocsMap = new Map<string, any>();
        
        // Firestore 'in' query supports up to 30 elements. We need to chunk it.
        const idChunks: string[][] = [];
        for (let i = 0; i < itemIds.length; i += 30) {
          idChunks.push(itemIds.slice(i, i + 30));
        }
        
        for (const chunk of idChunks) {
            const q = query(collectionRef, where(documentId(), "in", chunk));
            try {
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => {
                    existingDocsMap.set(doc.id, doc.data());
                });
            } catch (e) {
                 success = false;
                 onLogUpdate([`      - ❌ Erreur lors de la récupération des documents : ${(e as Error).message}`]);
                 // Continue with empty map, will try to write all docs
            }
        }
        onLogUpdate([`      - ${existingDocsMap.size} documents existants récupérés.`]);


        let addedCount = 0;
        let updatedCount = 0;
        let unchangedCount = 0;
        const itemsToUpdate: any[] = [];
        
        itemsWithId.forEach(item => {
            const docId = item[idKey].toString();
            const existingDoc = existingDocsMap.get(docId);
            if (!existingDoc) {
                itemsToUpdate.push(item);
                addedCount++;
            } else {
                if (!equal(existingDoc, item)) {
                    itemsToUpdate.push(item);
                    updatedCount++;
                } else {
                    unchangedCount++;
                }
            }
        });
        
        onLogUpdate([`      - Nouveaux: ${addedCount}, Modifiés: ${updatedCount}, Inchangés: ${unchangedCount}`]);
        
        if (itemsToUpdate.length === 0) {
            onLogUpdate([`      - ✅ Aucune mise à jour nécessaire.`]);
            return true;
        }
        
        onLogUpdate([`      - ${itemsToUpdate.length} documents à créer ou mettre à jour.`]);

        // Firestore batch writes are limited to 500 operations.
        const batchSize = 500;
        for (let i = 0; i < itemsToUpdate.length; i += batchSize) {
          const batchData = itemsToUpdate.slice(i, i + batchSize);
          const batch = writeBatch(firestore);
          
          batchData.forEach(item => {
            const docId = item[idKey].toString();
            const docRef = doc(collectionRef, docId);
            batch.set(docRef, item, { merge: true });
          });

          try {
            await batch.commit();
            onLogUpdate([`      - ✅ Lot ${i / batchSize + 1} sauvegardé avec succès.`]);
          } catch (e) {
            success = false;
            onLogUpdate([`      - ❌ Échec de la sauvegarde du lot ${i / batchSize + 1}.`]);
            console.error(`Échec de la sauvegarde du lot ${collectionName}`, e);
            const permissionError = new FirestorePermissionError({
                path: `${collectionName}`,
                operation: 'write',
                requestResourceData: batchData,
            });
            errorEmitter.emit('permission-error', permissionError);
          }
        }
        return success;
    }
  };


  const handleResetClick = () => {
    form.reset({
        apiKey: "P_q6uTM746JQlmFpewz3ZS0cDV0tT8UEXk",
        dateRange: { from: new Date(), to: new Date() },
        taskStatus: "all",
        roundStatus: "all",
        taskId: "",
        roundId: "",
        unplanned: false,
    });
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
                        selected={field.value as DateRange}
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
                        <SelectItem value="FAILED">Échouée</SelectItem>
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
            <Button type="submit" disabled={isLoading || isUserLoading}>
              {isExporting ? <Loader2 className="animate-spin" /> : <Rocket />}
              {isExporting ? "Export en cours..." : "Lancer l'Export"}
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleResetClick} disabled={isLoading || isUserLoading}>
                <RotateCcw/>Réinitialiser
              </Button>
              <Button type="button" onClick={handleSaveToFirestore} disabled={!hasData || isLoading || isUserLoading}>
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                {isSaving ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
              <Button type="button" onClick={() => handleDownload('tasks')} disabled={!taskJsonData || taskJsonData.length === 0 || isUserLoading}>
                <Download />Tâches
              </Button>
              <Button type="button" onClick={() => handleDownload('rounds')} disabled={!roundJsonData || roundJsonData.length === 0 || isUserLoading}>
                <Download />Tournées
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
