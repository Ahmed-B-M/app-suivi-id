
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
import { Badge } from "../ui/badge";

type MissingBacEntry = {
    task: Tache;
    bac: Tache['articles'][number];
}

type MissingBacsDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: MissingBacEntry[];
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
            Voici la liste des {tasks.length} bacs avec le statut "MISSING".
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
                    <TableHead>Livreur</TableHead>
                    <TableHead>Task ID</TableHead>
                    <TableHead>Type de Bac</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map(({task, bac}, index) => (
                    <TableRow key={`${task.tacheId}-${bac.codeBarre || 'null'}-${index}`}>
                      <TableCell>
                        {task.date ? format(new Date(task.date), "dd/MM/yyyy") : 'N/A'}
                      </TableCell>
                      <TableCell>{task.nomTournee || 'N/A'}</TableCell>
                      <TableCell>{getDriverFullName(task) || "N/A"}</TableCell>
                      <TableCell>{task.tacheId}</TableCell>
                      <TableCell>
                         <Badge variant="secondary">{bac.type || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{bac.statut || 'N/A'}</Badge>
                      </TableCell>
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

