
"use client";

import { useMemo } from 'react';
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
import { User, Award, Star, Clock, Smartphone, MapPinOff, Ban, ListTodo, TrendingDown, TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Skeleton } from '../ui/skeleton';

interface DriverPerformanceTableProps {
  data: DriverStats[];
  isLoading: boolean;
}

const StatCell = ({ value, unit, isRate = true, isLowerBetter = false }: { value: number | null, unit?: string, isRate?: boolean, isLowerBetter?: boolean }) => {
    let colorClass = "text-muted-foreground";
    if (value !== null) {
        if (isRate) {
             if (isLowerBetter) {
                if (value < 5) colorClass = "text-blue-600";
                else if (value < 15) colorClass = "text-orange-500";
                else colorClass = "text-destructive";
            } else {
                if (value > 95) colorClass = "text-blue-600";
                else if (value > 85) colorClass = "text-orange-500";
                else colorClass = "text-destructive";
            }
        } else { // For ratings
             if (value > 4.79) colorClass = "text-blue-600";
             else if (value > 4.5) colorClass = "text-orange-500";
             else colorClass = "text-destructive";
        }
    }
    
    return (
        <TableCell className={`text-right font-mono ${colorClass}`}>
            {value !== null ? `${value.toFixed(isRate ? 1: 2)}${unit || ''}` : "N/A"}
        </TableCell>
    )
}

const ColumnHeader = ({ title, tooltipText, children, className }: { title: string; tooltipText: string; children: React.ReactNode, className?: string }) => (
    <TableHead className={className}>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center justify-end gap-1.5 cursor-help">
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

const DriverTable = ({ drivers, title, icon }: { drivers: DriverStats[], title: string, icon: React.ReactNode }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                {icon}
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Livreur</TableHead>
                    <ColumnHeader title="Score" tooltipText="Score composite basé sur toutes les performances (sur 100)." className="w-[100px]">
                      <Award className="h-4 w-4" />
                    </ColumnHeader>
                    <ColumnHeader title="Note Moy." tooltipText="Note moyenne attribuée par les clients (sur 5)." className="w-[120px]">
                      <Star className="h-4 w-4" />
                    </ColumnHeader>
                    <ColumnHeader title="Ponctualité" tooltipText="Pourcentage de livraisons effectuées dans la fenêtre de ponctualité." className="w-[120px]">
                      <Clock className="h-4 w-4" />
                    </ColumnHeader>
                    <ColumnHeader title="SCANBAC" tooltipText="Pourcentage de tâches finalisées via l'application mobile." className="w-[120px]">
                      <Smartphone className="h-4 w-4" />
                    </ColumnHeader>
                    <ColumnHeader title="Sur Place Forcé" tooltipText="Pourcentage de tâches où l'arrivée a été forcée." className="w-[120px]">
                      <MapPinOff className="h-4 w-4" />
                    </ColumnHeader>
                    <ColumnHeader title="Cmd. Forcées" tooltipText="Pourcentage de livraisons forcées sans contact." className="w-[120px]">
                      <Ban className="h-4 w-4" />
                    </ColumnHeader>
                     <ColumnHeader title="Tâches" tooltipText="Nombre de tâches terminées sur la période." className="w-[100px]">
                      <ListTodo className="h-4 w-4" />
                    </ColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
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
        </CardContent>
    </Card>
);


export function DriverPerformanceTable({ data, isLoading }: DriverPerformanceTableProps) {

  const { top5, flop5 } = useMemo(() => {
    if (!data) return { top5: [], flop5: [] };
    
    const sortedByScore = [...data].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    
    const top5 = sortedByScore.slice(0, 5);
    const flop5 = sortedByScore.slice(-5).reverse();

    return { top5, flop5 };

  }, [data]);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  if (!data || data.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Performances des Livreurs</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-center py-8">Aucune donnée de performance à afficher (minimum 1 note requise par livreur).</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-8">
        {top5.length > 0 && <DriverTable drivers={top5} title="Top 5 Livreurs" icon={<TrendingUp className="text-blue-600"/>} />}
        {flop5.length > 0 && data.length > 5 && <DriverTable drivers={flop5} title="Flop 5 Livreurs" icon={<TrendingDown className="text-destructive"/>} />}
    </div>
  );
}
