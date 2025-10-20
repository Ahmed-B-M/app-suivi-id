
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

export type PunctualityTask = {
  task: Tache;
  minutes: number;
};

type PunctualityDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  details: {
    type: 'early' | 'late' | 'late_over_1h';
    tasks: PunctualityTask[];
  } | null;
};

export function PunctualityDetailsDialog({
  isOpen,
  onOpenChange,
  details,
}: PunctualityDetailsDialogProps) {
  if (!details) return null;

  const { type, tasks = [] } = details;

  const title = {
    early: "Détail des Livraisons en Avance",
    late: "Détail des Livraisons en Retard",
    late_over_1h: "Détail des Livraisons en Retard de Plus d'1h",
  }[type];

  const description = `Voici la liste des ${tasks.length} tâches correspondantes.`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
                    <TableHead className="text-center">{type === 'early' ? 'Avance (min)' : 'Retard (min)'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map(({ task, minutes }) => (
                    <TableRow key={task.tacheId}>
                      <TableCell>
                        {task.date ? format(new Date(task.date), "dd/MM/yyyy") : 'N/A'}
                      </TableCell>
                      <TableCell>{task.nomTournee || 'N/A'}</TableCell>
                      <TableCell>{task.nomHub || 'N/A'}</TableCell>
                      <TableCell>{getDriverFullName(task) || "N/A"}</TableCell>
                      <TableCell>{task.contact?.personne || "N/A"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={type === 'early' ? 'default' : 'destructive'}>
                          {minutes}
                        </Badge>
                      </TableCell>
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
