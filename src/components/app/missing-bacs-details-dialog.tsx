
"use client";

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

type MissingBacsDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: Tache[];
};

export function MissingBacsDetailsDialog({
  isOpen,
  onOpenChange,
  tasks,
}: MissingBacsDetailsDialogProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Détail des Bacs Manquants</DialogTitle>
          <DialogDescription>
            Voici la liste des {tasks.length} tâches avec des bacs manquants.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="pr-6">
            {tasks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Tournée</TableHead>
                    <TableHead>Entrepôt</TableHead>
                    <TableHead>Livreur</TableHead>
                    <TableHead>Client</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.tacheId}>
                      <TableCell>
                        {task.date ? format(new Date(task.date), "dd/MM/yyyy") : 'N/A'}
                      </TableCell>
                      <TableCell>{task.nomTournee || 'N/A'}</TableCell>
                      <TableCell>{task.nomHub || 'N/A'}</TableCell>
                      <TableCell>{getDriverFullName(task) || "N/A"}</TableCell>
                      <TableCell>{task.contact?.personne || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Aucune tâche avec des bacs manquants à afficher.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
