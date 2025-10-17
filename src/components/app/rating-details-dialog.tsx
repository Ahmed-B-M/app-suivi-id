
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
import { Star, MessageSquare, Calendar, Warehouse, Route, Hash } from "lucide-react";
import {format} from "date-fns";

type RatingDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: Tache[];
};

type RatingInfo = { 
  rating: number; 
  taskId: string | number;
  date?: string;
  hubName?: string;
  roundName?: string;
  sequence?: number;
  instructions?: string;
};

type RatingByDriver = {
  driverId: string;
  driverName: string;
  ratings: RatingInfo[];
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
      { driverName: string; ratings: RatingInfo[] }
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
        driversData[driverId].ratings.push({ 
          rating, 
          taskId: task.tacheId,
          date: task.date,
          hubName: task.nomHub,
          roundName: task.nomTournee,
          sequence: task.sequence,
          instructions: task.instructions,
        });
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Détail des Notes par Livreur</DialogTitle>
          <DialogDescription>
            Voici la liste de toutes les notes attribuées, regroupées par
            livreur, avec les détails de chaque tâche.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 pr-6">
            {ratingsByDriver.length > 0 ? (
              ratingsByDriver.map(({ driverId, driverName, ratings, average }) => (
                <div key={driverId} className="rounded-lg border p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">
                      Livreur: <span className="font-normal">{driverName}</span>
                    </h3>
                    <Badge variant="outline" className="flex items-center gap-1.5 text-base py-1 px-3">
                      Moyenne: {average.toFixed(2)}
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    </Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">ID Tâche</TableHead>
                        <TableHead>Détails de la Tâche</TableHead>
                        <TableHead className="text-right w-[80px]">Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ratings.map((ratingInfo) => (
                        <TableRow key={ratingInfo.taskId.toString()}>
                          <TableCell className="font-mono text-xs">{ratingInfo.taskId.toString()}</TableCell>
                          <TableCell>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground"/>
                                    <span>{ratingInfo.date ? format(new Date(ratingInfo.date), "dd/MM/yyyy") : 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Warehouse className="h-3.5 w-3.5 text-muted-foreground"/>
                                    <span>{ratingInfo.hubName || 'N/A'}</span>
                                </div>
                                 <div className="flex items-center gap-2">
                                    <Route className="h-3.5 w-3.5 text-muted-foreground"/>
                                    <span>Tournée: {ratingInfo.roundName || 'N/A'}</span>
                                </div>
                                 <div className="flex items-center gap-2">
                                    <Hash className="h-3.5 w-3.5 text-muted-foreground"/>
                                    <span>Séquence: {ratingInfo.sequence ?? 'N/A'}</span>
                                </div>
                                {ratingInfo.instructions && (
                                     <div className="flex items-start gap-2 col-span-2 mt-1">
                                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0"/>
                                        <span className="text-muted-foreground italic">"{ratingInfo.instructions}"</span>
                                    </div>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-lg">{ratingInfo.rating}</TableCell>
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
