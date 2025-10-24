
"use client";

import { useMemo } from "react";
import type { Tache } from "@/lib/types";
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
import { getDriverFullName } from "@/lib/grouping";

type ForcedAddressDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: Tache[];
};

export function ForcedAddressDetailsDialog({
  isOpen,
  onOpenChange,
  tasks = [],
}: ForcedAddressDetailsDialogProps) {
  const sortedTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return [];
    }

    const roundRecurrence = tasks.reduce((acc, task) => {
      const roundName = task.nomTournee || "N/A";
      acc[roundName] = (acc[roundName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [...tasks].sort((a, b) => {
      const roundNameA = a.nomTournee || "N/A";
      const roundNameB = b.nomTournee || "N/A";
      const recurrenceA = roundRecurrence[roundNameA];
      const recurrenceB = roundRecurrence[roundNameB];

      if (recurrenceB !== recurrenceA) {
        return recurrenceB - recurrenceA;
      }
      if (roundNameA < roundNameB) return -1;
      if (roundNameA > roundNameB) return 1;
      return (a.sequence ?? 0) - (b.sequence ?? 0);
    });
  }, [tasks]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-4">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Détail des "Sur Place Forcé"</DialogTitle>
          <DialogDescription>
            Voici la liste des {sortedTasks.length} tâches où l'arrivée a été forcée,
            triées par récurrence de la tournée.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tournée</TableHead>
                <TableHead>Numéro de Commande</TableHead>
                <TableHead>Entrepôt</TableHead>
                <TableHead>Séquence</TableHead>
                <TableHead>Livreur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.map((task) => (
                <TableRow key={task.tacheId}>
                  <TableCell>{task.nomTournee || "N/A"}</TableCell>
                  <TableCell className="font-mono">{task.tacheId}</TableCell>
                  <TableCell>{task.nomHub || "N/A"}</TableCell>
                  <TableCell className="text-center">
                    {task.sequence ?? "N/A"}
                  </TableCell>
                  <TableCell>{getDriverFullName(task) || "N/A"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sortedTasks.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Aucune tâche avec arrivée forcée pour la période sélectionnée.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
