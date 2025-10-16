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
  query,
  where,
} from "firebase/firestore";

import { exportFormSchema, type ExportFormValues } from "@/lib/schemas";
import { runExportAction } from "@/app/actions";
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

type ExportFormProps = {
  onExportComplete: (logs: string[], data: any[] | null) => void;
  onReset: () => void;
  jsonData: any[] | null;
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export function ExportForm({
  onExportComplete,
  onReset,
  jsonData,
}: ExportFormProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportFormSchema),
    defaultValues: {
      apiKey: "P_q6uTM746JQlmFpewz3ZS0cDV0tT8UEXk",
      from: today,
      to: tomorrow,
      status: "all",
      taskId: "",
      roundId: "",
      unplanned: false,
    },
  });

  const onSubmit = async (values: ExportFormValues) => {
    setIsExporting(true);
    onReset();
    const result = await runExportAction(values);
    onExportComplete(result.logs, result.jsonData);
    setIsExporting(false);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: result.error,
      });
    }
  };

  const handleDownload = () => {
    if (!jsonData) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(jsonData, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "donnees_urbantz_tasks_filtrees.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleSaveToFirestore = async () => {
    if (!jsonData || !firestore) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Aucune donnée à sauvegarder ou la base de données n'est pas disponible.",
      });
      return;
    }

    setIsSaving(true);
    onExportComplete([`\n💾 Sauvegarde de ${jsonData.length} tâches dans Firestore...`], null);

    const collectionRef = collection(firestore, 'tasks');
    let success = true;
    let itemsToSave = [];

    try {
      onExportComplete(["   - Récupération des données existantes pour comparaison..."], null);
      const existingDocsSnapshot = await getDocs(collectionRef);
      const existingDocsMap = new Map();
      existingDocsSnapshot.forEach(doc => {
        existingDocsMap.set(doc.id, doc.data().dateMiseAJour);
      });
      onExportComplete([`   - ${existingDocsMap.size} documents existants trouvés.`], null);

      for (const item of jsonData) {
        const docId = item.tacheId;
        if (!docId) continue;

        const existingTimestamp = existingDocsMap.get(docId.toString());
        const newTimestamp = item.dateMiseAJour;

        if (!existingTimestamp || (newTimestamp && new Date(newTimestamp) > new Date(existingTimestamp))) {
            itemsToSave.push(item);
        }
      }
      onExportComplete([`\n   - ${itemsToSave.length} nouvelles tâches ou tâches mises à jour à sauvegarder.`], null);

    } catch (e) {
        const errorMsg = "❌ Une erreur est survenue lors de la récupération des données existantes.";
        let detailedError = e instanceof Error ? e.message : "Erreur inconnue";
        onExportComplete([errorMsg, detailedError], null);
        toast({ title: "Erreur", description: detailedError, variant: "destructive" });
        setIsSaving(false);
        return;
    }

    if (itemsToSave.length === 0) {
        onExportComplete(["\n✅ Aucune nouvelle donnée à sauvegarder. La base de données est à jour."], null);
        setIsSaving(false);
        toast({ title: "A jour", description: "Aucune nouvelle donnée à sauvegarder." });
        return;
    }

    const batchSize = 450;
    const chunks = [];
    for (let i = 0; i < itemsToSave.length; i += batchSize) {
      chunks.push(itemsToSave.slice(i, i + batchSize));
    }

    for (const chunk of chunks) {
      const currentBatchIndex = chunks.indexOf(chunk) + 1;
      onExportComplete([`   - Traitement du lot ${currentBatchIndex}/${chunks.length}... (${chunk.length} documents)`], null);
      
      try {
        const batch = writeBatch(firestore);
        chunk.forEach((item) => {
          const docId = item.tacheId;
          if (docId) {
            const docRef = doc(collectionRef, docId.toString());
            batch.set(docRef, item, { merge: true });
          }
        });
        await batch.commit();
        onExportComplete([`   - Lot de ${chunk.length} tâches sauvegardé avec succès.`], null);
        await delay(100);
      } catch (e) {
        const errorMsg = "❌ Une erreur est survenue lors de la sauvegarde du lot dans Firestore.";
        let detailedError = e instanceof Error ? e.message : "Erreur inconnue";
        
        onExportComplete([errorMsg, detailedError], null);
        toast({
          variant: "destructive",
          title: `Erreur lors de la sauvegarde du lot ${currentBatchIndex}`,
          description: detailedError,
        });
        success = false;
        break;
      }
    }
    
    if (success) {
      onExportComplete([`\n✨ ${itemsToSave.length} documents sauvegardés dans Firestore !`], null);
      toast({
        title: "Succès",
        description: "Toutes les données ont été sauvegardées dans Firestore.",
      });
    } else {
      onExportComplete([`\n❌ La sauvegarde a été interrompue en raison d'une erreur.`], null);
    }
    
    setIsSaving(false);
  };


  const handleResetClick = () => {
    form.reset();
    onReset();
  }

  const isLoading = isExporting || isSaving;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration de l'Export des Tâches</CardTitle>
        <CardDescription>
          Configurez et lancez l'exportation des tâches depuis l'API Urbantz.
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
                  <FormLabel>Clé d'API</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Votre clé d'API Urbantz"
                      className="font-code"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de début</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Choisir une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de fin</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Choisir une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut de la tâche</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un statut" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="COMPLETED">Terminée</SelectItem>
                      <SelectItem value="ONGOING">En cours</SelectItem>
                      <SelectItem value="ASSIGNED">Assignée</SelectItem>
                      <SelectItem value="UNPLANNED">Non planifiée</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="taskId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID de la tâche</FormLabel>
                    <FormControl>
                      <Input placeholder="Entrer l'ID de la tâche" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roundId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID de la tournée</FormLabel>
                    <FormControl>
                      <Input placeholder="Entrer l'ID de la tournée" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="unplanned"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Inclure les tâches non planifiées
                    </FormLabel>
                    <FormDescription>
                      Si coché, récupère les tâches sans date assignée.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2">
            <Button type="submit" disabled={isLoading}>
              {isExporting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Rocket />
              )}
              {isExporting ? "Export en cours..." : "Lancer l'export"}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleResetClick} disabled={isLoading}>
                <RotateCcw/>
                Réinitialiser
              </Button>
              <Button
                type="button"
                onClick={handleSaveToFirestore}
                disabled={!jsonData || jsonData.length === 0 || isLoading}
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save />
                )}
                {isSaving ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
              <Button
                type="button"
                onClick={handleDownload}
                disabled={!jsonData || jsonData.length === 0}
              >
                <Download />
                Télécharger JSON
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
