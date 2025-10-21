
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
  Timestamp,
} from "firebase/firestore";
import equal from "deep-equal";

import { serverExportSchema, unifiedExportFormSchema, type UnifiedExportFormValues } from "@/lib/schemas";
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
   const [autoSaveTrigger, setAutoSaveTrigger] = useState(false);

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

  const { watch } = form;
  const dateRange = watch("dateRange");

  useEffect(() => {
    // Set default date range on the client to avoid hydration mismatch
    const today = new Date();
    form.setValue("dateRange", {
      from: today,
      to: today,
    });
  }, [form]);
  
  useEffect(() => {
    if (autoSaveTrigger) {
      handleSaveToFirestore();
      setAutoSaveTrigger(false); // Reset trigger
    }
  }, [autoSaveTrigger]);


  const onSubmit = async (values: UnifiedExportFormValues) => {
    onExportStart();
    
    const fromString = values.dateRange?.from ? format(values.dateRange.from, 'yyyy-MM-dd') : '';
    const toString = values.dateRange?.to ? format(values.dateRange.to, 'yyyy-MM-dd') : fromString;

    const serverValues = {
      ...values,
      from: fromString,
      to: toString,
    };
    
    const result = await runUnifiedExportAction(serverValues);
    onExportComplete(result.logs, result.data);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Échec de l'exportation",
        description: result.error,
      });
    } else if (result.data) {
       onLogUpdate([`\n⏱️  Attente de 5 secondes avant la sauvegarde automatique...`]);
       await delay(5000);
       setAutoSaveTrigger(true); // Trigger the save
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
        if (!dateRange?.from) {
          onLogUpdate(["   - ❌ Erreur: Aucune plage de dates n'est sélectionnée pour la sauvegarde."]);
          onSavingChange(false);
          return true; // Indicate error
        }


        let anyError = false;

        if (taskJsonData) { 
            const success = await saveCollection('tasks', taskJsonData, 'tacheId', dateRange);
            if (!success) anyError = true;
        }
        if (roundJsonData) {
            const success = await saveCollection('rounds', roundJsonData, 'id', dateRange);
            if (!success) anyError = true;
        }

        onSavingChange(false);
        return anyError;
    }


    async function saveCollection(collectionName: 'tasks' | 'rounds', dataFromApi: any[], idKey: string, dateRange: DateRange): Promise<boolean> {
        onLogUpdate([`\n   -> Synchronisation de la collection "${collectionName}"...`]);
        const collectionRef = collection(firestore, collectionName);
        let success = true;

        if (!dateRange.from) {
          onLogUpdate([`      - ⚠️ Aucune date de début sélectionnée. Impossible de déterminer les documents à supprimer.`]);
          return false;
        }

        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0,0,0,0);
        const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
        toDate.setHours(23,59,59,999);

        onLogUpdate([`      - Recherche des documents existants entre ${format(fromDate, 'dd/MM/yy')} et ${format(toDate, 'dd/MM/yy')}...`]);
        
        const existingDocsMap = new Map<string, any>();
        let documentsToDelete: string[] = [];

        try {
            const fromString = format(fromDate, 'yyyy-MM-dd');
            const toString = format(toDate, 'yyyy-MM-dd') + '\uf8ff';
            const q = query(collectionRef, where("date", ">=", fromString), where("date", "<=", toString));

            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => existingDocsMap.set(doc.id, doc.data()));
            onLogUpdate([`      - ${existingDocsMap.size} documents trouvés dans la base de données pour cette période.`]);
            
            const idsFromApi = new Set(dataFromApi.map(item => item[idKey]?.toString()).filter(Boolean));
            documentsToDelete = Array.from(existingDocsMap.keys()).filter(id => !idsFromApi.has(id));

            if(documentsToDelete.length > 0) {
              onLogUpdate([`      - 🗑️ ${documentsToDelete.length} documents marqués pour suppression.`]);
              const deleteBatch = writeBatch(firestore);
              documentsToDelete.forEach(id => {
                deleteBatch.delete(doc(collectionRef, id));
              });
              await deleteBatch.commit();
              onLogUpdate([`      - ✅ Suppression effectuée.`]);
            } else {
               onLogUpdate([`      - ✅ Aucune suppression nécessaire.`]);
            }
        } catch(e) {
          success = false;
          onLogUpdate([`      - ❌ Erreur lors de la recherche ou suppression des documents existants : ${(e as Error).message}`]);
        }


        let addedCount = 0;
        let updatedCount = 0;
        let unchangedCount = 0;
        const itemsToUpdate: any[] = [];
        
        const itemsWithId = dataFromApi.filter(item => item[idKey]);
        
        itemsWithId.forEach(item => {
            const docId = item[idKey].toString();
            const existingDoc = existingDocsMap.get(docId);
            if (!existingDoc) {
                itemsToUpdate.push(item);
                addedCount++;
            } else {
                const comparableExisting = { ...existingDoc, date: existingDoc.date?.toDate ? existingDoc.date.toDate().toISOString() : existingDoc.date };
                const comparableApiItem = { ...item };

                if (!equal(comparableExisting, comparableApiItem)) {
                    itemsToUpdate.push(item);
                    updatedCount++;
                } else {
                    unchangedCount++;
                }
            }
        });
        
        onLogUpdate([`      - Nouveaux: ${addedCount}, Modifiés: ${updatedCount}, Inchangés (ignorés): ${unchangedCount}`]);
        
        if (itemsToUpdate.length === 0) {
            onLogUpdate([`      - ✅ Aucune création ou mise à jour nécessaire.`]);
            return success;
        }
        
        onLogUpdate([`      - Préparation de ${itemsToUpdate.length} documents à créer ou mettre à jour...`]);

        const batchSize = 500;
        for (let i = 0; i < itemsToUpdate.length; i += batchSize) {
          const batchData = itemsToUpdate.slice(i, i + batchSize);
          const batch = writeBatch(firestore);
          
          batchData.forEach(item => {
            const docId = item[idKey].toString();
            const docRef = doc(collectionRef, docId);
            const dataToSet = { ...item };
            if (dataToSet.date) {
                dataToSet.date = new Date(dataToSet.date);
            }
            batch.set(docRef, dataToSet, { merge: true });
          });

          try {
            onLogUpdate([`      - Écriture du lot ${i / batchSize + 1}/${Math.ceil(itemsToUpdate.length / batchSize)}...`]);
            await batch.commit();
            onLogUpdate([`      - ✅ Lot sauvegardé avec succès.`]);
            if (itemsToUpdate.length > batchSize && i + batchSize < itemsToUpdate.length) {
              onLogUpdate([`      - ⏱️ Pause de 500ms...`]);
              await delay(500);
            }
          } catch (e) {
            success = false;
            onLogUpdate([`      - ❌ Échec de la sauvegarde du lot ${i / batchSize + 1}.`]);
            console.error(`Échec de la sauvegarde du lot ${collectionName}`, e);
            const permissionError = new FirestorePermissionError({
                path: `${collectionName}`,
                operation: 'write',
                requestResourceData: batchData.map(item => item[idKey]),
            });
            errorEmitter.emit('permission-error', permissionError);
          }
        }
        return success;
    }
  };


  const handleResetClick = () => {
    const today = new Date();
    form.reset({
        apiKey: "P_q6uTM746JQlmFpewz3ZS0cDV0tT8UEXk",
        dateRange: { from: today, to: today },
        taskStatus: "all",
        roundStatus: "all",
        taskId: "",
        roundId: "",
        unplanned: false,
    });
    onReset();
  }

  const isLoading = isExporting || isSaving;

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
            <Button type="submit" disabled={isLoading || isUserLoading} className="min-w-[200px]">
              {isExporting && <><Loader2 className="animate-spin" />Export en cours...</>}
              {isSaving && <><Loader2 className="animate-spin" />Sauvegarde...</>}
              {!isLoading && <><Rocket />Exporter & Sauvegarder</>}
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleResetClick} disabled={isLoading || isUserLoading}>
                <RotateCcw/>Réinitialiser
              </Button>
              <Button type="button" onClick={() => handleDownload('tasks')} disabled={!taskJsonData || taskJsonData.length === 0 || isLoading}>
                <Download />Tâches
              </Button>
              <Button type="button" onClick={() => handleDownload('rounds')} disabled={!roundJsonData || roundJsonData.length === 0 || isLoading}>
                <Download />Tournées
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
