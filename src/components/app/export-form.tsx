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
} from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type ExportFormProps = {
  onExportComplete: (logs: string[], data: any[] | null) => void;
  onReset: () => void;
  jsonData: any[] | null;
};

export function ExportForm({
  onExportComplete,
  onReset,
  jsonData,
}: ExportFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportFormSchema),
    defaultValues: {
      apiKey: "P_q6uTM746JQlmFpewz3ZS0cDV0tT8UEXk",
      from: new Date("2025-09-17"),
      to: new Date("2025-09-17"),
      hubs: "643d1b6f48ee2952098a2e60,643d1af5cfe5c0793a3267c4,5c51e0782c99a67a610c7c9c,6363fb105a892b9794bc60bd,5b339c63221dbf1cbe9e695e,5b339c7c4a73200f926b326e",
    },
  });

  const onSubmit = async (values: ExportFormValues) => {
    setIsLoading(true);
    onReset();
    const result = await runExportAction(values);
    onExportComplete(result.logs, result.jsonData);
    setIsLoading(false);

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

  const handleResetClick = () => {
    form.reset();
    onReset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration de l'Export</CardTitle>
        <CardDescription>
          Configurez et lancez l'exportation des données depuis l'API Urbantz.
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
              name="hubs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IDs de Hub</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Entrez les IDs de hub, séparés par des virgules"
                      className="font-code"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Séparez les multiples IDs par une virgule.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Rocket />
              )}
              {isLoading ? "Export en cours..." : "Lancer l'export"}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleResetClick} disabled={isLoading}>
                <RotateCcw/>
                Réinitialiser
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
