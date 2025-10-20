
"use client";

import type { Tournee } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDepotFromHub, getCarrierFromDriver, getDriverFullName } from "@/lib/grouping";
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] flex flex-col gap-4">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Détail des Tournées</DialogTitle>
          <DialogDescription>
            Voici la liste des {rounds.length} tournées pour la période sélectionnée.
          </DialogDescription>
        </DialogHeader>
        
        {/* Use a simple div with native browser scrolling */}
        <div className="flex-1 overflow-y-auto pr-6">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Nom de la tournée</TableHead>
                <TableHead>Dépôt</TableHead>
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
                    <TableCell>{getDepotFromHub(round.nomHub)}</TableCell>
                    <TableCell>{round.nomHub || 'N/A'}</TableCell>
                    <TableCell>{getCarrierFromDriver(round)}</TableCell>
                    <TableCell>{getDriverFullName(round) || 'N/A'}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
