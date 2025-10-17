
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="text-destructive"/>
            Détail des Alertes Qualité
          </DialogTitle>
          <DialogDescription>
            Voici la liste des {tasks.length} tâches ayant reçu une note inférieure à 4.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="pr-6">
            {tasks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Livreur</TableHead>
                    <TableHead>Tournée</TableHead>
                    <TableHead>Seq.</TableHead>
                    <TableHead className="text-center">Note</TableHead>
                    <TableHead>Commentaire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.tacheId}>
                      <TableCell>
                        {task.date ? format(new Date(task.date), "dd/MM/yyyy") : 'N/A'}
                      </TableCell>
                       <TableCell>{getDriverFullName(task) || 'N/A'}</TableCell>
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

    