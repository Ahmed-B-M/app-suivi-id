
"use client";

import { useMemo } from "react";
import type { Tache, Tournee } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import { getDriverFullName } from "@/lib/grouping";
import { calculateRoundStats } from "@/lib/scoring";

type CompletedRoundsDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  rounds: Tournee[];
  allTasks: Tache[];
};

export function CompletedRoundsDetailsDialog({
  isOpen,
  onOpenChange,
  rounds = [],
  allTasks = [],
}: CompletedRoundsDetailsDialogProps) {
  const enrichedRounds = useMemo(() => {
    return rounds
      .map((round) => ({
        ...round,
        ...calculateRoundStats(round, allTasks),
      }))
      .sort((a, b) => {
        const dateA = a.realInfo?.hasFinished
          ? new Date(a.realInfo.hasFinished).getTime()
          : 0;
        const dateB = b.realInfo?.hasFinished
          ? new Date(b.realInfo.hasFinished).getTime()
          : 0;
        return dateB - dateA;
      });
  }, [rounds, allTasks]);

  const formatDuration = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return "N/A";
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
  };

  const getPunctualityVariant = (rate: number | null) => {
    if (rate === null) return "secondary";
    if (rate >= 95) return "default";
    if (rate >= 90) return "outline";
    return "destructive";
  };

  const getRatingVariant = (rating: number | null) => {
    if (rating === null) return "secondary";
    if (rating >= 4.8) return "default";
    if (rating >= 4.5) return "outline";
    return "destructive";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[85vh] flex flex-col gap-4">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Détail des Tournées Terminées</DialogTitle>
          <DialogDescription>
            Voici la liste des {enrichedRounds.length} tournées terminées pour la période
            sélectionnée.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Heure de Clôture</TableHead>
                <TableHead>Nom de la tournée</TableHead>
                <TableHead>Entrepôt</TableHead>
                <TableHead>Livreur</TableHead>
                <TableHead className="text-right">Durée Estimée</TableHead>
                <TableHead className="text-right">Durée Réalisée</TableHead>
                <TableHead className="text-center">Note Moyenne</TableHead>
                <TableHead className="text-center">Ponctualité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedRounds.map((round) => (
                <TableRow key={round.id}>
                  <TableCell>
                    {round.realInfo?.hasFinished
                      ? format(
                          new Date(round.realInfo.hasFinished),
                          "dd/MM/yy HH:mm"
                        )
                      : "N/A"}
                  </TableCell>
                  <TableCell>{round.name || "N/A"}</TableCell>
                  <TableCell>{round.nomHub || "N/A"}</TableCell>
                  <TableCell>{getDriverFullName(round) || "N/A"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatDuration(round.totalTime)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatDuration(round.realInfo?.hasLasted)}
                  </TableCell>
                  <TableCell className="text-center">
                    {round.averageRating !== null ? (
                      <Badge variant={getRatingVariant(round.averageRating)}>
                        {round.averageRating.toFixed(2)}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">N/A</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {round.punctualityRate !== null ? (
                      <Badge
                        variant={getPunctualityVariant(round.punctualityRate)}
                      >
                        {round.punctualityRate.toFixed(1)}%
                      </Badge>
                    ) : (
                      <Badge variant="secondary">N/A</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {enrichedRounds.length === 0 && (
             <p className="text-muted-foreground text-center py-8">Aucune tournée terminée pour la période sélectionnée.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
