
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDriverFullName } from "@/lib/grouping";
import { format } from "date-fns";

type FailedDeliveryDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: Tache[];
};

export function FailedDeliveryDetailsDialog({
  isOpen,
  onOpenChange,
  tasks,
}: FailedDeliveryDetailsDialogProps) {

  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    return [...tasks].sort((a, b) => {
      const dateA = a.dateCloture ? new Date(a.dateCloture).getTime() : 0;
      const dateB = b.dateCloture ? new Date(b.dateCloture).getTime() : 0;
      return dateB - dateA;
    });
  }, [tasks]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Détail des Échecs de Livraison</DialogTitle>
          <DialogDescription>
            Voici la liste des {sortedTasks.length} tâches terminées avec un statut de non-livraison, triées par date de clôture.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="pr-6">
            {sortedTasks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Clôture</TableHead>
                    <TableHead>Tournée</TableHead>
                    <TableHead>Entrepôt</TableHead>
                    <TableHead>Séquence</TableHead>
                    <TableHead>Livreur</TableHead>
                    <TableHead>Téléphone Client</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTasks.map((task) => (
                    <TableRow key={task.tacheId}>
                      <TableCell>
                        {task.dateCloture ? format(new Date(task.dateCloture), "dd/MM/yy HH:mm") : 'N/A'}
                      </TableCell>
                      <TableCell>{task.nomTournee || 'N/A'}</TableCell>
                      <TableCell>{task.nomHub || 'N/A'}</TableCell>
                      <TableCell className="text-center">{task.sequence ?? 'N/A'}</TableCell>
                      <TableCell>{getDriverFullName(task) || "N/A"}</TableCell>
                      <TableCell>{task.telephoneContact || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Aucune tâche à afficher.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
