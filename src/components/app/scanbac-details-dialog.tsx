
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

type ScanbacDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: Tache[];
};

export function ScanbacDetailsDialog({
  isOpen,
  onOpenChange,
  tasks = [],
}: ScanbacDetailsDialogProps) {
  const sortedTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return [];
    }

    // 1. Compter la récurrence de chaque tournée
    const roundRecurrence = tasks.reduce((acc, task) => {
      const roundName = task.nomTournee || "N/A";
      acc[roundName] = (acc[roundName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 2. Trier les tâches en fonction de la récurrence de la tournée
    const sorted = [...tasks].sort((a, b) => {
      const roundNameA = a.nomTournee || "N/A";
      const roundNameB = b.nomTournee || "N/A";

      const recurrenceA = roundRecurrence[roundNameA];
      const recurrenceB = roundRecurrence[roundNameB];

      // Trier par récurrence décroissante
      if (recurrenceB !== recurrenceA) {
        return recurrenceB - recurrenceA;
      }
      
      // Si la récurrence est la même, trier par nom de tournée
      if (roundNameA < roundNameB) return -1;
      if (roundNameA > roundNameB) return 1;

      // Enfin, trier par séquence
      return (a.sequence ?? 0) - (b.sequence ?? 0);
    });

    return sorted;
  }, [tasks]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-4">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Détail des Validations Manuelles (Web)</DialogTitle>
          <DialogDescription>
            Voici la liste des {sortedTasks.length} tâches validées via le web,
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
              Aucune tâche validée par web pour la période sélectionnée.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
