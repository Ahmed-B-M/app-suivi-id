
"use client";

import type { Tournee } from "@/lib/types";
import { useMemo } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDepotFromHub, getCarrierFromDriver } from "@/lib/grouping";
import { format } from "date-fns";

type AllRoundsDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  rounds: Tournee[];
};

export function AllRoundsDetailsDialog({
  isOpen,
  onOpenChange,
  rounds = [],
}: AllRoundsDetailsDialogProps) {

  const stats = useMemo(() => {
    if (!rounds || rounds.length === 0) {
      return { byDepot: {}, byHub: {}, byCarrier: {} };
    }
    const byDepot = rounds.reduce((acc, round) => {
      const depot = getDepotFromHub(round.nomHub) || "Inconnu";
      acc[depot] = (acc[depot] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byHub = rounds.reduce((acc, round) => {
      const hub = round.nomHub || "Inconnu";
      acc[hub] = (acc[hub] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byCarrier = rounds.reduce((acc, round) => {
      const carrier = getCarrierFromDriver(round) || "Inconnu";
      acc[carrier] = (acc[carrier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { byDepot, byHub, byCarrier };
  }, [rounds]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-4">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Détail des Tournées</DialogTitle>
          <DialogDescription>
            Voici la liste des {rounds.length} tournées pour la période sélectionnée.
          </DialogDescription>
        </DialogHeader>
        
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Par Dépôt</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {Object.entries(stats.byDepot).map(([depot, count]) => (
                <Badge key={depot} variant="secondary" className="text-xs">{depot}: {count}</Badge>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Par Entrepôt</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1">
               {Object.entries(stats.byHub).map(([hub, count]) => (
                <Badge key={hub} variant="secondary" className="text-xs">{hub}: {count}</Badge>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Par Transporteur</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1">
               {Object.entries(stats.byCarrier).map(([carrier, count]) => (
                <Badge key={carrier} variant="secondary" className="text-xs">{carrier}: {count}</Badge>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Table Section */}
        <div className="flex-1 relative">
            <ScrollArea className="absolute inset-0">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Nom de la tournée</TableHead>
                    <TableHead>Entrepôt</TableHead>
                    <TableHead>Transporteur</TableHead>
                    <TableHead>Livreur</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rounds.map((round) => (
                    <TableRow key={round.id}>
                        <TableCell>
                        {round.date ? format(new Date(round.date), "dd/MM/yyyy") : 'N/A'}
                        </TableCell>
                        <TableCell>{round.name || 'N/A'}</TableCell>
                        <TableCell>{round.nomHub || 'N/A'}</TableCell>
                        <TableCell>{getCarrierFromDriver(round)}</TableCell>
                        <TableCell>{round.driver ? `${round.driver.firstName || ''} ${round.driver.lastName || ''}`.trim() : 'N/á'}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
