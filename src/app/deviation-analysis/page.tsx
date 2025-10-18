
"use client";

import { useMemo } from "react";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Scale } from "lucide-react";
import type { Tache, Tournee } from "@/lib/types";
import { useFilterContext } from "@/context/filter-context";
import { getDriverFullName } from "@/lib/grouping";
import { format } from "date-fns";

interface Deviation {
  round: Tournee;
  totalWeight: number;
  capacity: number;
  deviation: number;
}

export default function DeviationAnalysisPage() {
  const { firestore } = useFirebase();
  const { dateRange } = useFilterContext();

  const tasksCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "tasks");
  }, [firestore]);

  const roundsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "rounds");
  }, [firestore]);

  const {
    data: tasks,
    isLoading: isLoadingTasks,
    error: tasksError,
  } = useCollection<Tache>(tasksCollection);
  const {
    data: rounds,
    isLoading: isLoadingRounds,
    error: roundsError,
  } = useCollection<Tournee>(roundsCollection);

  const deviations = useMemo((): Deviation[] => {
    if (!tasks || !rounds) {
      return [];
    }

    const { from, to } = dateRange || {};
    let filteredRounds = rounds;
    let filteredTasks = tasks;

    if (from) {
      const startOfDay = new Date(from);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = to ? new Date(to) : new Date(from);
      endOfDay.setHours(23, 59, 59, 999);

      const filterByDate = (item: Tache | Tournee) => {
        const itemDateString = item.date;
        if (!itemDateString) return false;
        const itemDate = new Date(itemDateString);
        return itemDate >= startOfDay && itemDate <= endOfDay;
      };

      filteredRounds = rounds.filter(filterByDate);
      filteredTasks = tasks.filter(filterByDate);
    }

    const tasksWeightByRound = new Map<string, number>();

    for (const task of filteredTasks) {
      if (!task.nomTournee || !task.date || !task.nomHub) {
        continue;
      }
      // Clé composite pour associer tâche et tournée
      const roundKey = `${task.nomTournee}-${task.date.split('T')[0]}-${task.nomHub}`;
      const taskWeight = task.dimensions?.poids ?? 0;

      if (taskWeight > 0) {
        const currentWeight = tasksWeightByRound.get(roundKey) || 0;
        tasksWeightByRound.set(roundKey, currentWeight + taskWeight);
      }
    }
    
    const results: Deviation[] = [];

    for (const round of filteredRounds) {
      const roundCapacity = round.vehicle?.dimensions?.poids;

      if (typeof roundCapacity !== "number" || !round.name || !round.date || !round.nomHub) {
        continue;
      }
      
      const roundKey = `${round.name}-${round.date.split('T')[0]}-${round.nomHub}`;
      const totalWeight = tasksWeightByRound.get(roundKey) || 0;

      if (totalWeight > roundCapacity) {
        results.push({
          round,
          totalWeight,
          capacity: roundCapacity,
          deviation: totalWeight - roundCapacity,
        });
      }
    }

    return results.sort((a, b) => b.deviation - a.deviation);
  }, [tasks, rounds, dateRange]);

  const isLoading = isLoadingTasks || isLoadingRounds;
  const error = tasksError || roundsError;

  return (
    <main className="flex-1 container py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Analyse des Ecarts de Poids</h1>
      </div>

      {isLoading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle />
              Erreur de chargement des données
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Impossible de charger les données. Veuillez vérifier vos
              permissions et la configuration.
            </p>
            <pre className="mt-4 text-sm bg-background p-2 rounded">
              {error.message}
            </pre>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale />
              Tournées en Surcharge de Poids
            </CardTitle>
            <CardDescription>
              Liste des tournées dont le poids total des tâches dépasse la capacité maximale du véhicule assigné.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deviations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Tournée</TableHead>
                    <TableHead>Entrepôt</TableHead>
                    <TableHead>Livreur</TableHead>
                    <TableHead className="text-right">Poids Calculé (kg)</TableHead>
                    <TableHead className="text-right">Capacité (kg)</TableHead>
                    <TableHead className="text-right text-destructive">Ecart (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deviations.map(({ round, totalWeight, capacity, deviation }) => (
                    <TableRow key={round.id}>
                      <TableCell>
                        {round.date
                          ? format(new Date(round.date), "dd/MM/yyyy")
                          : "N/A"}
                      </TableCell>
                      <TableCell className="font-medium">{round.name}</TableCell>
                      <TableCell>{round.nomHub || 'N/A'}</TableCell>
                      <TableCell>{getDriverFullName(round) || "N/A"}</TableCell>
                      <TableCell className="text-right font-mono">
                        {totalWeight.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {capacity.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-destructive">
                        +{deviation.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p>Aucune tournée en surcharge détectée pour la période sélectionnée.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
