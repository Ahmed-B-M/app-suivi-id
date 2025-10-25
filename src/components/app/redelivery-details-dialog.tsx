
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
import { useMemo } from "react";

type RedeliveryDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: Tache[];
};

export function RedeliveryDetailsDialog({
  isOpen,
  onOpenChange,
  tasks,
}: RedeliveryDetailsDialogProps) {

  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    return [...tasks].sort((a, b) => {
      const hubCompare = (a.nomHub || '').localeCompare(b.nomHub || '');
      if (hubCompare !== 0) return hubCompare;

      const roundCompare = (a.nomTournee || '').localeCompare(b.nomTournee || '');
      if (roundCompare !== 0) return roundCompare;
      
      return (a.sequence ?? 0) - (b.sequence ?? 0);
    });
  }, [tasks]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Détail des Relivraisons</DialogTitle>
          <DialogDescription>
            Voici la liste des {sortedTasks.length} échecs de livraison avec 2 tentatives ou plus, triés par tournée et séquence.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="pr-6">
            {sortedTasks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Entrepôt</TableHead>
                    <TableHead>Tournée</TableHead>
                    <TableHead>Seq.</TableHead>
                    <TableHead>Livreur</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-center">Tentatives</TableHead>
                    <TableHead className="text-right">Bacs Secs</TableHead>
                    <TableHead className="text-right">Bacs Frais</TableHead>
                    <TableHead className="text-right">Surgelés</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTasks.map((task) => {
                    const bacsSecs = (task.articles || []).filter(a => a.type === 'BAC_SEC').length;
                    const bacsFrais = (task.articles || []).filter(a => a.type === 'BAC_FRAIS').length;
                    const bacsSurgeles = (task.articles || []).filter(a => a.type === 'BAC_SURGELE').length;
                    
                    return (
                      <TableRow key={task.tacheId}>
                        <TableCell>
                          {task.date ? format(new Date(task.date as string), "dd/MM/yyyy") : 'N/A'}
                        </TableCell>
                        <TableCell>{task.nomHub || 'N/A'}</TableCell>
                        <TableCell>{task.nomTournee || 'N/A'}</TableCell>
                        <TableCell className="text-center">{task.sequence ?? 'N/A'}</TableCell>
                        <TableCell>{getDriverFullName(task) || "N/A"}</TableCell>
                        <TableCell>{task.contact?.personne || "N/A"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">{task.tentatives}</Badge>
                        </TableCell>
                         <TableCell className="text-right font-mono">{bacsSecs}</TableCell>
                        <TableCell className="text-right font-mono">{bacsFrais}</TableCell>
                        <TableCell className="text-right font-mono">{bacsSurgeles}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Aucune tâche de relivraison à afficher.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
