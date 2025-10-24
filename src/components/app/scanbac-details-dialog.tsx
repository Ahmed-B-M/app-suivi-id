
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-4">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Détail des Validations Manuelles (Web)</DialogTitle>
          <DialogDescription>
            Voici la liste des {tasks.length} tâches terminées qui ont été validées via le web au lieu de l'application mobile.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-6">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Numéro de Commande</TableHead>
                <TableHead>Entrepôt</TableHead>
                <TableHead>Tournée</TableHead>
                <TableHead>Séquence</TableHead>
                <TableHead>Livreur</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tasks.map((task) => (
                <TableRow key={task.tacheId}>
                    <TableCell className="font-mono">{task.tacheId}</TableCell>
                    <TableCell>{task.nomHub || 'N/A'}</TableCell>
                    <TableCell>{task.nomTournee || 'N/A'}</TableCell>
                    <TableCell className="text-center">{task.sequence ?? 'N/A'}</TableCell>
                    <TableCell>{getDriverFullName(task) || 'N/A'}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
             {tasks.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                    Aucune tâche validée par web pour la période sélectionnée.
                </p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
