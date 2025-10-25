
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
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Détail des Surcharges de Poids (> 1250kg)</DialogTitle>
          <DialogDescription>
            Voici la liste des {data.length} tournées dépassant la capacité de
            poids de 1250kg.
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(({ round, totalWeight }) => (
                <TableRow key={round.id}>
                  <TableCell>
                    {round.date
                      ? format(new Date(round.date as string), "dd/MM/yyyy")
                      : "N/A"}
                  </TableCell>
                  <TableCell className="font-medium">{round.name}</TableCell>
                  <TableCell>{round.nomHub || "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="destructive">{totalWeight.toFixed(2)}</Badge>
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
