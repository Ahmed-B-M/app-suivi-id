
"use client";

import { useMemo } from "react";
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

const countBacs = (task: Tache) => {
    if (!task.articles) return { secs: 0, frais: 0, surgeles: 0 };
    return task.articles.reduce((acc, article) => {
        if (article.type === 'BAC_SEC') acc.secs++;
        else if (article.type === 'BAC_FRAIS') acc.frais++;
        else if (article.type === 'BAC_SURGELE') acc.surgeles++;
        return acc;
    }, { secs: 0, frais: 0, surgeles: 0 });
};


type RedeliveryDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  allTasks: Tache[];
  redeliveryTaskIds: string[];
};

export function RedeliveryDetailsDialog({
  isOpen,
  onOpenChange,
  allTasks,
  redeliveryTaskIds,
}: RedeliveryDetailsDialogProps) {

  const enrichedAndSortedTasks = useMemo(() => {
    if (!allTasks || !redeliveryTaskIds) return [];
    
    const taskIdsSet = new Set(redeliveryTaskIds);
    const relevantTasks = allTasks.filter(task => taskIdsSet.has(task.tacheId));

    return [...relevantTasks].sort((a, b) => {
      const hubA = a.nomHub || "";
      const hubB = b.nomHub || "";
      if (hubA.localeCompare(hubB) !== 0) {
        return hubA.localeCompare(hubB);
      }
      const roundA = a.nomTournee || "";
      const roundB = b.nomTournee || "";
      if (roundA.localeCompare(roundB) !== 0) {
        return roundA.localeCompare(roundB);
      }
      return (a.sequence || 0) - (b.sequence || 0);
    });
  }, [allTasks, redeliveryTaskIds]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Détail des Relivraisons</DialogTitle>
          <DialogDescription>
            Voici la liste des {enrichedAndSortedTasks.length} échecs de livraison avec 2 tentatives ou plus.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="pr-6">
            {enrichedAndSortedTasks.length > 0 ? (
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
                  {enrichedAndSortedTasks.map((task) => {
                    const bacCounts = countBacs(task);
                    
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
                         <TableCell className="text-right font-mono">{bacCounts.secs}</TableCell>
                        <TableCell className="text-right font-mono">{bacCounts.frais}</TableCell>
                        <TableCell className="text-right font-mono">{bacCounts.surgeles}</TableCell>
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
