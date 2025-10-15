"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Download,
  Loader2,
  Rocket,
  RotateCcw,
  Save,
} from "lucide-react";

import { hubExportFormSchema, type HubExportFormValues } from "@/lib/schemas";
import { runHubExportAction, saveDataToFirestoreAction } from "@/app/actions";

import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";

type HubExportFormProps = {
  onExportComplete: (logs: string[], data: any[] | null) => void;
  onReset: () => void;
  jsonData: any[] | null;
};

export function HubExportForm({
  onExportComplete,
  onReset,
  jsonData,
}: HubExportFormProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<HubExportFormValues>({
    resolver: zodResolver(hubExportFormSchema),
    defaultValues: {
      apiKey: "P_q6uTM746JQlmFpewz3ZS0cDV0tT8UEXk",
    },
  });

  const onSubmit = async (values: HubExportFormValues) => {
    setIsExporting(true);
    onReset();
    const result = await runHubExportAction(values);
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
    link.download = "donnees_urbantz_hubs.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleSaveToFirestore = async () => {
    if (!jsonData) return;
    setIsSaving(true);

    const result = await saveDataToFirestoreAction('hubs', jsonData);
    
    onExportComplete(result.logs, null);
    
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Sauvegarde échouée",
        description: result.error,
      });
    } else {
       toast({
        title: "Succès",
        description: "Données sauvegardées dans Firestore.",
      });
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
        <CardTitle>Configuration de l'Export des Hubs</CardTitle>
        <CardDescription>
          Lancez l'exportation des hubs depuis l'API Urbantz.
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
                Sauvegarder
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
