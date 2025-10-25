
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
import { Badge } from "../ui/badge";
import { format } from "date-fns";

type OverbacsData = {
  round: Tournee;
  totalBacs: number;
  deviation: number;
};

type OverbacsRoundsDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  data: OverbacsData[];
};

export function OverbacsRoundsDetailsDialog({
  isOpen,
  onOpenChange,
  data = [],
}: OverbacsRoundsDetailsDialogProps) {
    const BACS_LIMIT = 105;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Détail des Surcharges de Bacs (> {BACS_LIMIT})</DialogTitle>
          <DialogDescription>
            Voici la liste des {data.length} tournées dépassant la limite de
            {BACS_LIMIT} bacs, triées par ordre d'importance.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Tournée</TableHead>
                <TableHead>Entrepôt</TableHead>
                <TableHead className="text-right">Total Bacs</TableHead>
                <TableHead className="text-right">Écart</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(({ round, totalBacs, deviation }) => (
                <TableRow key={round.id}>
                  <TableCell>
                    {round.date
                      ? format(new Date(round.date as string), "dd/MM/yyyy")
                      : "N/A"}
                  </TableCell>
                  <TableCell className="font-medium">{round.name}</TableCell>
                  <TableCell>{round.nomHub || "N/A"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {totalBacs}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-destructive">
                    +{deviation}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Aucune surcharge de bacs détectée.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
