
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
import { TasksTable } from "./tasks-table";

type StatusDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  details: {
    status: string;
    tasks: Tache[];
    type: 'status' | 'progression';
  } | null;
};

export function StatusDetailsDialog({
  isOpen,
  onOpenChange,
  details,
}: StatusDetailsDialogProps) {
  if (!details) return null;

  const { status, tasks, type } = details;
  const title = `Détail - ${type === 'status' ? 'Statut' : 'Progression'}: ${status}`;
  const description = `Voici la liste des ${tasks.length} tâches ayant le ${type} "${status}".`;

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
              <TasksTable data={tasks} />
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Aucune tâche à afficher pour cette sélection.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
