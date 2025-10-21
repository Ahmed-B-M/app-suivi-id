
"use client";

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
import { ScrollArea } from "@/components/ui/scroll-area";

type AllTasksDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: Tache[];
};

export function AllTasksDetailsDialog({
  isOpen,
  onOpenChange,
  tasks = [],
}: AllTasksDetailsDialogProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-4">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Détail de toutes les Tâches</DialogTitle>
          <DialogDescription>
            Voici la liste des {tasks.length} tâches pour la période et les filtres sélectionnés.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-6">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>ID Tâche</TableHead>
                    <TableHead>Entrepôt</TableHead>
                    <TableHead>Tournée</TableHead>
                    <TableHead className="text-center">Séquence</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tasks.map((task, index) => (
                <TableRow key={`${task.tacheId}-${index}`}>
                    <TableCell className="font-mono">{task.tacheId}</TableCell>
                    <TableCell>{task.nomHub || 'N/A'}</TableCell>
                    <TableCell>{task.nomTournee || 'N/A'}</TableCell>
                    <TableCell className="text-center">{task.sequence ?? 'N/A'}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
