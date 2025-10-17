
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
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

type RatingDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: Tache[];
};

type RatingByDriver = {
  driverId: string;
  driverName: string;
  ratings: { rating: number; taskId: string | number }[];
  average: number;
};

export function RatingDetailsDialog({
  isOpen,
  onOpenChange,
  tasks,
}: RatingDetailsDialogProps) {
  const ratingsByDriver = useMemo(() => {
    const driversData: Record<
      string,
      { driverName: string; ratings: { rating: number; taskId: string | number }[] }
    > = {};

    tasks.forEach((task) => {
      const rating = task.metaDonnees?.notationLivreur;
      const driverId = task.livreur?.idExterne || "Non assigné";
      const driverName =
        driverId !== "Non assigné"
          ? `${task.livreur?.prenom || ""} ${task.livreur?.nom || ""}`.trim()
          : "Non assigné";

      if (typeof rating === "number") {
        if (!driversData[driverId]) {
          driversData[driverId] = { driverName, ratings: [] };
        }
        driversData[driverId].ratings.push({ rating, taskId: task.tacheId });
      }
    });

    return Object.entries(driversData)
      .map(([driverId, data]) => {
        const average =
          data.ratings.reduce((sum, item) => sum + item.rating, 0) /
          data.ratings.length;
        return { driverId, driverName: data.driverName, ratings: data.ratings, average };
      })
      .sort((a, b) => b.average - a.average);
  }, [tasks]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Détail des Notes par Livreur</DialogTitle>
          <DialogDescription>
            Voici la liste de toutes les notes attribuées, regroupées par
            livreur.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-6">
            {ratingsByDriver.length > 0 ? (
              ratingsByDriver.map(({ driverId, driverName, ratings, average }) => (
                <div key={driverId} className="rounded-lg border p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">
                      Livreur: <span className="font-normal">{driverName}</span>
                    </h3>
                    <Badge variant="outline" className="flex items-center gap-1 text-base">
                      Moyenne: {average.toFixed(2)}
                      <Star className="h-4 w-4 text-yellow-400" />
                    </Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID de la Tâche</TableHead>
                        <TableHead className="text-right">Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ratings.map(({ taskId, rating }) => (
                        <TableRow key={taskId.toString()}>
                          <TableCell className="font-mono">{taskId.toString()}</TableCell>
                          <TableCell className="text-right">{rating}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Aucune note trouvée pour la période sélectionnée.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
