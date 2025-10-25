
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
import { Badge } from "@/components/ui/badge";
import { getDriverFullName } from "@/lib/grouping";
import { format } from "date-fns";
import { Megaphone, MessageSquare, Star } from "lucide-react";
import { useMemo } from "react";

type QualityAlertDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: Tache[];
};

export function QualityAlertDialog({
  isOpen,
  onOpenChange,
  tasks,
}: QualityAlertDialogProps) {

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
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="text-destructive"/>
            Détail des Alertes Qualité
          </DialogTitle>
          <DialogDescription>
            Voici la liste des {sortedTasks.length} tâches ayant reçu une note inférieure à 4, triées par date de clôture.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="pr-6">
            {sortedTasks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Clôture</TableHead>
                    <TableHead>Livreur</TableHead>
                    <TableHead>Entrepôt</TableHead>
                    <TableHead>Tournée</TableHead>
                    <TableHead>Seq.</TableHead>
                    <TableHead className="text-center">Note</TableHead>
                    <TableHead>Commentaire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTasks.map((task) => (
                    <TableRow key={task.tacheId}>
                      <TableCell>
                        {task.dateCloture ? format(new Date(task.dateCloture), "dd/MM/yy HH:mm") : (task.date ? format(new Date(task.date), "dd/MM/yy") : 'N/A')}
                      </TableCell>
                       <TableCell>{getDriverFullName(task) || 'N/A'}</TableCell>
                       <TableCell>{task.nomHub || 'N/A'}</TableCell>
                      <TableCell>{task.nomTournee || 'N/A'}</TableCell>
                      <TableCell>{task.sequence ?? 'N/A'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive" className="flex items-center justify-center gap-1">
                          {task.metaDonnees?.notationLivreur}
                          <Star className="h-3 w-3"/>
                        </Badge>
                      </TableCell>
                       <TableCell className="italic text-muted-foreground">
                        {task.metaDonnees?.commentaireLivreur ? (
                           <div className="flex items-start gap-2">
                             <MessageSquare className="h-4 w-4 mt-1 shrink-0" />
                             <span>"{task.metaDonnees.commentaireLivreur}"</span>
                           </div>
                        ) : 'Aucun commentaire'}
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Aucune alerte qualité pour cette période.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
