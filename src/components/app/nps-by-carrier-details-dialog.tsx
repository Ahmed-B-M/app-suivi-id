
"use client";

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

type NpsByCarrierData = {
  name: string;
  nps: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
};

type NpsByCarrierDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  data: NpsByCarrierData[];
};

export function NpsByCarrierDetailsDialog({
  isOpen,
  onOpenChange,
  data = [],
}: NpsByCarrierDetailsDialogProps) {

    const getNpsVariant = (nps: number): "default" | "secondary" | "destructive" => {
        if (nps >= 50) return "default";
        if (nps >= 0) return "secondary";
        return "destructive";
    }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Détail du Score NPS par Transporteur</DialogTitle>
          <DialogDescription>
            Ventilation du score NPS pour chaque transporteur sur la période sélectionnée.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[70vh] overflow-y-auto pr-6">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Transporteur</TableHead>
                <TableHead className="text-center">Score NPS</TableHead>
                <TableHead className="text-center">Promoteurs</TableHead>
                <TableHead className="text-center">Passifs</TableHead>
                <TableHead className="text-center">Détracteurs</TableHead>
                <TableHead className="text-center">Total Réponses</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((carrier) => (
                <TableRow key={carrier.name}>
                    <TableCell className="font-medium">{carrier.name}</TableCell>
                    <TableCell className="text-center">
                        <Badge variant={getNpsVariant(carrier.nps)} className="text-lg">
                            {carrier.nps.toFixed(1)}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-green-600">{carrier.promoters}</TableCell>
                    <TableCell className="text-center font-mono text-gray-500">{carrier.passives}</TableCell>
                    <TableCell className="text-center font-mono text-red-600">{carrier.detractors}</TableCell>
                    <TableCell className="text-center font-mono font-bold">{carrier.total}</TableCell>
                </TableRow>
                ))}
                 {data.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            Aucune donnée NPS à afficher.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
