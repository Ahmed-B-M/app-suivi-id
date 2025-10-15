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
} from "firebase/firestore";

import { roundExportFormSchema, type RoundExportFormValues } from "@/lib/schemas";
import { runRoundExportAction } from "@/app/actions";
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
import { useFirebase } from "@/firebase";

type RoundExportFormProps = {
  onExportComplete: (logs: string[], data: any[] | null) => void;
  onReset: () => void;
  jsonData: any[] | null;
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export function RoundExportForm({
  onExportComplete,
  onReset,
  jsonData,
}: RoundExportFormProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();
  
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const form = useForm<RoundExportFormValues>({
    resolver: zodResolver(roundExportFormSchema),
    defaultValues: {
      apiKey: "P_q6uTM746JQlmFpewz3ZS0cDV0tT8UEXk",
      from: today,
      to: tomorrow,
      status: "all",
    },
  });

  const onSubmit = async (values: RoundExportFormValues) => {
    setIsExporting(true);
    onReset();
    const result = await runRoundExportAction(values);
    onExportComplete(result.logs, result.jsonData);
    setIsExporting(false);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Échec de l'exportation",
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
    link.download = "donnees_urbantz_rounds_filtrees.json";
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
    onExportComplete([`\n💾 Sauvegarde de ${jsonData.length} tournées dans Firestore...`], null);

    const collectionRef = collection(firestore, 'rounds');
    const batchSize = 450;
    let success = true;

    const chunks = [];
    for (let i = 0; i < jsonData.length; i += batchSize) {
      chunks.push(jsonData.slice(i, i + batchSize));
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      onExportComplete([`   - Traitement du lot ${i + 1}... (${chunk.length} documents)`], null);
      
      try {
        const batch = writeBatch(firestore);
        chunk.forEach((item) => {
          const docId = item.id || item._id;
          if (docId) {
            const docRef = doc(collectionRef, docId.toString());
            batch.set(docRef, item, { merge: true });
          }
        });
        await batch.commit();
        onExportComplete([`   - Lot de ${chunk.length} tournées sauvegardé avec succès.`], null);
        await delay(100);
      } catch (e) {
        const errorMsg = "❌ Une erreur est survenue lors de la sauvegarde du lot dans Firestore.";
        let detailedError = e instanceof Error ? e.message : "Erreur inconnue";
        
        onExportComplete([errorMsg, detailedError], null);
        toast({
          variant: "destructive",
          title: `Erreur lors de la sauvegarde du lot ${i + 1}`,
          description: detailedError,
        });
        success = false;
        break;
      }
    }
    
    if (success) {
      onExportComplete([`\n✨ ${jsonData.length} documents sauvegardés dans Firestore !`], null);
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
        <CardTitle>Configuration de l'Export des Tournées</CardTitle>
        <CardDescription>
          Configurez et lancez l'exportation des tournées depuis l'API Urbantz.
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
                  <FormLabel>Statut de la tournée</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un statut" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="CREATED">Créée</SelectItem>
                      <SelectItem value="VALIDATED">Validée</SelectItem>
                      <SelectItem value="PUBLISHED">Publiée</SelectItem>
                      <SelectItem value="ONGOING">En cours</SelectItem>
                      <SelectItem value="ASSIGNED">Assignée</SelectItem>
                      <SelectItem value="IN_PREPARATION">En préparation</SelectItem>
                      <SelectItem value="COMPLETED">Terminée</SelectItem>
                      <SelectItem value="READY">Prête</SelectItem>
                      <SelectItem value="ARRIVED">Arrivée</SelectItem>
                      <SelectItem value="IN_DELIVERY">En livraison</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
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
