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
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";

import { ticketExportFormSchema, type TicketExportFormValues } from "@/lib/schemas";
import { runTicketExportAction, saveDataToFirestoreAction } from "@/app/actions";
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

type TicketExportFormProps = {
  onExportComplete: (logs: string[], data: any[] | null) => void;
  onReset: () => void;
  jsonData: any[] | null;
};

export function TicketExportForm({
  onExportComplete,
  onReset,
  jsonData,
}: TicketExportFormProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const form = useForm<TicketExportFormValues>({
    resolver: zodResolver(ticketExportFormSchema),
    defaultValues: {
      apiKey: "P_q6uTM746JQlmFpewz3ZS0cDV0tT8UEXk",
      from: today,
      to: tomorrow,
    },
  });

  const onSubmit = async (values: TicketExportFormValues) => {
    setIsExporting(true);
    onReset();
    const result = await runTicketExportAction(values);
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
    link.download = "donnees_urbantz_tickets.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleSaveToFirestore = async () => {
    if (!jsonData) return;
    setIsSaving(true);

    const result = await saveDataToFirestoreAction('tickets', jsonData);
    
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
        <CardTitle>Configuration de l'Export des Tickets</CardTitle>
        <CardDescription>
          Configurez et lancez l'exportation des tickets depuis l'API Urbantz.
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
