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

import { customerExportFormSchema, type CustomerExportFormValues } from "@/lib/schemas";
import { runCustomerExportAction, saveBatchToFirestoreAction } from "@/app/actions";

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

type CustomerExportFormProps = {
  onExportComplete: (logs: string[], data: any[] | null) => void;
  onReset: () => void;
  jsonData: any[] | null;
};

export function CustomerExportForm({
  onExportComplete,
  onReset,
  jsonData,
}: CustomerExportFormProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<CustomerExportFormValues>({
    resolver: zodResolver(customerExportFormSchema),
    defaultValues: {
      apiKey: "P_q6uTM746JQlmFpewz3ZS0cDV0tT8UEXk",
    },
  });

  const onSubmit = async (values: CustomerExportFormValues) => {
    setIsExporting(true);
    onReset();
    const result = await runCustomerExportAction(values);
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
    link.download = "donnees_urbantz_customers.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleSaveToFirestore = async () => {
    if (!jsonData) return;
    setIsSaving(true);
    onExportComplete([`\n💾 Sauvegarde de ${jsonData.length} clients dans Firestore...`], null);

    const batchSize = 450;
    let success = true;

    for (let i = 0; i < jsonData.length; i += batchSize) {
        const chunk = jsonData.slice(i, i + batchSize);
        onExportComplete([`   - Traitement du lot ${i / batchSize + 1}... (${chunk.length} documents)`], null);
        
        const result = await saveBatchToFirestoreAction('customers', chunk);
        
        onExportComplete(result.logs, null);
        
        if (result.error) {
            toast({
                variant: "destructive",
                title: `Erreur lors de la sauvegarde du lot ${i / batchSize + 1}`,
                description: result.error,
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
        <CardTitle>Configuration de l'Export des Clients</CardTitle>
        <CardDescription>
          Lancez l'exportation des clients depuis l'API Urbantz.
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
