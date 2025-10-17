
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DriverStats } from "@/lib/scoring";
import { User, Award, Star, Clock, Smartphone, MapPinOff, Ban, ListTodo } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DriverPerformanceTableProps {
  data: DriverStats[];
}

const StatCell = ({ value, unit, isRate = true, isLowerBetter = false }: { value: number | null, unit?: string, isRate?: boolean, isLowerBetter?: boolean }) => {
    let colorClass = "text-muted-foreground";
    if (value !== null) {
        if (isRate) {
             if (isLowerBetter) {
                if (value < 5) colorClass = "text-green-600";
                else if (value < 15) colorClass = "text-orange-500";
                else colorClass = "text-red-600";
            } else {
                if (value > 95) colorClass = "text-green-600";
                else if (value > 85) colorClass = "text-orange-500";
                else colorClass = "text-red-600";
            }
        } else { // For ratings
             if (value > 4.79) colorClass = "text-green-600";
             else if (value > 4.5) colorClass = "text-orange-500";
             else colorClass = "text-red-600";
        }
    }
    
    return (
        <TableCell className={`text-right font-mono ${colorClass}`}>
            {value !== null ? `${value.toFixed(2)}${unit || ''}` : "N/A"}
        </TableCell>
    )
}

const ColumnHeader = ({ title, tooltipText, children }: { title: string; tooltipText: string; children: React.ReactNode }) => (
    <TableHead className="text-right">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center justify-end gap-2 cursor-help">
                        {children}
                        <span>{title}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltipText}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </TableHead>
)

export function DriverPerformanceTable({ data }: DriverPerformanceTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 text-center text-muted-foreground">
        Aucune donnée de performance des livreurs à afficher pour la période sélectionnée.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Livreur</TableHead>
            <ColumnHeader title="Score" tooltipText="Score composite basé sur toutes les performances (sur 100).">
              <Award />
            </ColumnHeader>
            <ColumnHeader title="Note Moy." tooltipText="Note moyenne attribuée par les clients (sur 5).">
              <Star />
            </ColumnHeader>
            <ColumnHeader title="Ponctualité" tooltipText="Pourcentage de livraisons effectuées dans la fenêtre de ponctualité.">
              <Clock />
            </ColumnHeader>
            <ColumnHeader title="SCANBAC" tooltipText="Pourcentage de tâches finalisées via l'application mobile.">
              <Smartphone />
            </ColumnHeader>
            <ColumnHeader title="Sur Place Forcé" tooltipText="Pourcentage de tâches où l'arrivée a été forcée.">
              <MapPinOff />
            </ColumnHeader>
            <ColumnHeader title="Cmd. Forcées" tooltipText="Pourcentage de livraisons forcées sans contact.">
              <Ban />
            </ColumnHeader>
             <ColumnHeader title="Tâches" tooltipText="Nombre de tâches terminées sur la période.">
              <ListTodo />
            </ColumnHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((driver) => (
            <TableRow key={driver.name}>
              <TableCell className="font-medium flex items-center gap-2">
                <User className="text-muted-foreground"/> {driver.name}
              </TableCell>
              <TableCell className="text-right font-bold text-lg">
                <Badge variant={driver.score! >= 80 ? "default" : "secondary" } className="w-14 justify-center text-base">
                    {driver.score!.toFixed(1)}
                </Badge>
              </TableCell>
              <StatCell value={driver.averageRating} isRate={false}/>
              <StatCell value={driver.punctualityRate} unit="%"/>
              <StatCell value={driver.scanbacRate} unit="%"/>
              <StatCell value={driver.forcedAddressRate} unit="%" isLowerBetter/>
              <StatCell value={driver.forcedContactlessRate} unit="%" isLowerBetter/>
              <TableCell className="text-right font-mono text-muted-foreground">{driver.completedTasks}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
