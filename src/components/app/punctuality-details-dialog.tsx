
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

export type PunctualityTask = {
  task: Tache;
  minutes: number;
};

type PunctualityDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  details: {
    type: 'early' | 'late';
    tasks: PunctualityTask[];
  } | null;
};

const formatTimeSlot = (start?: string, end?: string) => {
    if (!start) return "N/A";
    const startTime = format(new Date(start), "HH:mm");
    const endTime = end ? format(new Date(end), "HH:mm") : "";
    return endTime ? `${startTime} - ${endTime}` : startTime;
}

export function PunctualityDetailsDialog({
  isOpen,
  onOpenChange,
  details,
}: PunctualityDetailsDialogProps) {
  if (!details) return null;

  const { type, tasks } = details;
  const title = type === 'early' ? "Détail des Tâches en Avance" : "Détail des Tâches en Retard";
  const description = `Voici la liste des tâches terminées en ${type === 'early' ? 'avance' : 'retard'} par rapport à la fenêtre de ponctualité.`;
  const timeColumnTitle = type === 'early' ? "Avance (min)" : "Retard (min)";

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
                    <TableHead>Livreur</TableHead>
                    <TableHead>Tournée</TableHead>
                    <TableHead>Seq.</TableHead>
                    <TableHead>Créneau Prévu</TableHead>
                    <TableHead>Heure de Clôture</TableHead>
                    <TableHead className="text-right">{timeColumnTitle}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map(({ task, minutes }) => (
                    <TableRow key={task.tacheId}>
                      <TableCell>{getDriverFullName(task) || "N/A"}</TableCell>
                      <TableCell>{task.nomTournee || 'N/A'}</TableCell>
                      <TableCell>{task.sequence ?? 'N/A'}</TableCell>
                      <TableCell>
                        {formatTimeSlot(task.creneauHoraire?.debut, task.creneauHoraire?.fin)}
                      </TableCell>
                      <TableCell>
                        {task.dateCloture ? format(new Date(task.dateCloture), "HH:mm") : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {minutes}
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

    