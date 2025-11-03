
"use client";

import { useMemo, useState } from "react";
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
import { Star, MessageSquare, Calendar, Warehouse, Route, Hash, Search, ListChecks } from "lucide-react";
import {format} from "date-fns";
import { Input } from "../ui/input";
import { getDriverFullName } from "@/lib/grouping";

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
  comment?: string;
};

type RatingByDriver = {
  driverName: string;
  ratings: RatingInfo[];
  average: number;
  completedTasks: number;
};

export function RatingDetailsDialog({
  isOpen,
  onOpenChange,
  tasks,
}: RatingDetailsDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const ratingsByDriver = useMemo(() => {
    const driversData: Record<
      string,
      { ratings: RatingInfo[], completedTasks: number }
    > = {};

    tasks.forEach((task) => {
      const driverName = getDriverFullName(task);
      
      if (!driverName || driverName === "Inconnu") {
        return;
      }

      if (!driversData[driverName]) {
          driversData[driverName] = { ratings: [], completedTasks: 0 };
      }

      if (task.progression === 'COMPLETED') {
        driversData[driverName].completedTasks++;
      }

      const rating = task.notationLivreur;
      if (typeof rating === "number") {
        driversData[driverName].ratings.push({ 
          rating, 
          taskId: task.tacheId,
          date: task.date as string,
          hubName: task.nomHub,
          roundName: task.nomTournee,
          sequence: task.sequence,
          comment: task.metaCommentaireLivreur,
        });
      }
    });

    return Object.entries(driversData)
      .map(([driverName, data]) => {
        const average =
          data.ratings.length > 0
            ? data.ratings.reduce((sum, item) => sum + item.rating, 0) /
              data.ratings.length
            : 0;
        return { driverName, ratings: data.ratings, average, completedTasks: data.completedTasks };
      })
      .sort((a, b) => b.average - a.average);
  }, [tasks]);

  const filteredDrivers = useMemo(() => {
    if (!searchQuery) {
      return ratingsByDriver;
    }
    return ratingsByDriver.filter(driver => 
      driver.driverName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [ratingsByDriver, searchQuery]);

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
         <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un livreur..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-6">
            {filteredDrivers.length > 0 ? (
              filteredDrivers.map(({ driverName, ratings, average, completedTasks }) => (
                <div key={driverName} className="rounded-lg border p-4">
                  <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h3 className="font-semibold text-lg">
                      {driverName}
                    </h3>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="flex items-center gap-1.5 text-sm py-1 px-3">
                        <ListChecks className="h-4 w-4" />
                        {completedTasks} tâches terminées
                      </Badge>
                       <Badge variant="secondary" className="flex items-center gap-1.5 text-sm py-1 px-3">
                        {ratings.length} notes
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1.5 text-base py-1 px-3">
                        Moyenne: {average.toFixed(2)}
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      </Badge>
                    </div>
                  </div>
                  {ratings.length > 0 ? (
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
                                  {ratingInfo.comment && (
                                       <div className="flex items-start gap-2 col-span-2 mt-1">
                                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0"/>
                                          <span className="text-muted-foreground italic">"{ratingInfo.comment}"</span>
                                      </div>
                                  )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg">{ratingInfo.rating}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                     <p className="text-muted-foreground text-center text-sm py-4">Aucune note pour ce livreur sur la période sélectionnée.</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Aucun livreur trouvé pour la recherche ou la période sélectionnée.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
