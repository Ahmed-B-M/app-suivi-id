"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BrainCircuit,
  CalendarClock,
  ClipboardList,
  FileClock,
  Loader2,
} from "lucide-react";

import { schedulerSchema, type SchedulerFormValues } from "@/lib/schemas";
import { getScheduleAction } from "@/app/actions";
import { type OptimizeApiCallScheduleOutput } from "@/ai/flows/optimize-api-call-schedule";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Separator } from "@/components/ui/separator";

export function Scheduler() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizeApiCallScheduleOutput | null>(
    null
  );

  const form = useForm<SchedulerFormValues>({
    resolver: zodResolver(schedulerSchema),
    defaultValues: {
      estimatedDataSize: 10,
      apiRateLimit: 60,
      serverLoadThreshold: 75,
      dataExportFrequency: "daily",
    },
  });

  const onSubmit = async (values: SchedulerFormValues) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const response = await getScheduleAction(values);

    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      setResult(response.data);
    }

    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-primary" />
          <CardTitle>Planificateur Automatisé</CardTitle>
        </div>
        <CardDescription>
          Utilisez l'IA pour déterminer le meilleur calendrier pour les appels
          API et l'exportation.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="estimatedDataSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taille des données (MB)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apiRateLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite de débit API (appels/min)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="60" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serverLoadThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seuil de charge serveur (%)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="75" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dataExportFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fréquence d'exportation</FormLabel>
                  <FormControl>
                    <Input placeholder="daily, weekly, monthly" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Analyse en cours..." : "Générer le calendrier"}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <div className="space-y-4 pt-4">
                <Separator />
                <h3 className="font-semibold">Résultats de l'optimisation</h3>
                <Alert>
                  <FileClock className="h-4 w-4" />
                  <AlertTitle>Intervalle d'appel optimal</AlertTitle>
                  <AlertDescription>
                    {result.optimalCallInterval}
                  </AlertDescription>
                </Alert>
                <Alert>
                  <CalendarClock className="h-4 w-4" />
                  <AlertTitle>Heure d'exportation suggérée</AlertTitle>
                  <AlertDescription>
                    {result.suggestedExportTime}
                  </AlertDescription>
                </Alert>
                <Alert>
                  <ClipboardList className="h-4 w-4" />
                  <AlertTitle>Notes supplémentaires</AlertTitle>
                  <AlertDescription>{result.notes}</AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </form>
      </Form>
    </Card>
  );
}
