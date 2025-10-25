
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

type OverweightData = {
  round: Tournee;
  totalWeight: number;
  deviation: number;
};

type OverweightRoundsDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  data: OverweightData[];
};

export function OverweightRoundsDetailsDialog({
  isOpen,
  onOpenChange,
  data = [],
}: OverweightRoundsDetailsDialogProps) {
  const WEIGHT_LIMIT = 1250;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Détail des Surcharges de Poids (> {WEIGHT_LIMIT}kg)</DialogTitle>
          <DialogDescription>
            Voici la liste des {data.length} tournées dépassant la capacité de
            poids de {WEIGHT_LIMIT}kg, triées par ordre d'importance.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Tournée</TableHead>
                <TableHead>Entrepôt</TableHead>
                <TableHead className="text-right">Poids Calculé (kg)</TableHead>
                <TableHead className="text-right">Capacité (kg)</TableHead>
                <TableHead className="text-right">Écart (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(({ round, totalWeight, deviation }) => (
                <TableRow key={round.id}>
                  <TableCell>
                    {round.date
                      ? format(new Date(round.date as string), "dd/MM/yyyy")
                      : "N/A"}
                  </TableCell>
                  <TableCell className="font-medium">{round.name}</TableCell>
                  <TableCell>{round.nomHub || "N/A"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {totalWeight.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {WEIGHT_LIMIT.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-destructive">
                    +{deviation.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Aucune surcharge de poids détectée.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
