
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

interface DriverPerformanceRankingsProps {
  data: DriverStats[];
  isLoading: boolean;
}

const StatCell = ({ value, unit, isRate = true, isLowerBetter = false }: { value: number | null, unit?: string, isRate?: boolean, isLowerBetter?: boolean }) => {
    let colorClass = "text-muted-foreground";
    if (value !== null) {
        if (isRate) {
             if (isLowerBetter) {
                if (value < 5) colorClass = "text-green-600";
                else if (value < 15) colorClass = "text-orange-500";
                else colorClass = "text-destructive";
            } else {
                if (value > 95) colorClass = "text-green-600";
                else if (value > 85) colorClass = "text-orange-500";
                else colorClass = "text-destructive";
            }
        } else { // For ratings
             if (value > 4.79) colorClass = "text-green-600";
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


export function DriverPerformanceRankings({ data, isLoading }: DriverPerformanceRankingsProps) {

  const rankings = useMemo(() => {
    if (!data) return { full: [], flopRating: [], flopPunctuality: [], flopScanbac: [], flopForcedAddress: [], flopForcedContactless: [] };
    
    const sortedByScore = [...data].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    
    const flopRating = [...data]
      .filter(d => d.averageRating !== null)
      .sort((a, b) => (a.averageRating ?? 5) - (b.averageRating ?? 5))
      .slice(0, 5);

    const flopPunctuality = [...data]
      .filter(d => d.punctualityRate !== null)
      .sort((a, b) => (a.punctualityRate ?? 100) - (b.punctualityRate ?? 100))
      .slice(0, 5);

    const flopScanbac = [...data]
        .filter(d => d.scanbacRate !== null)
        .sort((a,b) => (a.scanbacRate ?? 100) - (b.scanbacRate ?? 100))
        .slice(0,5);
    
    const flopForcedAddress = [...data]
        .filter(d => d.forcedAddressRate !== null)
        .sort((a,b) => (b.forcedAddressRate ?? 0) - (a.forcedAddressRate ?? 0))
        .slice(0,5);

    const flopForcedContactless = [...data]
        .filter(d => d.forcedContactlessRate !== null)
        .sort((a,b) => (b.forcedContactlessRate ?? 0) - (a.forcedContactlessRate ?? 0))
        .slice(0,5);


    return {
      full: sortedByScore,
      flopRating,
      flopPunctuality,
      flopScanbac,
      flopForcedAddress,
      flopForcedContactless
    };

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
                <p className="text-muted-foreground text-center py-8">Aucune donnée de performance des livreurs à afficher pour cette période (minimum 1 note requise par livreur).</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Classement Complet des Livreurs</CardTitle>
                <CardDescription>
                    Liste de tous les livreurs classés par leur score de performance global, calculé sur la base de multiples indicateurs.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <DriverTable drivers={rankings.full} title="Classement Complet" icon={<Award />} />
            </CardContent>
        </Card>
        
        <h3 className="text-xl font-bold tracking-tight pt-4">Analyse des Points Faibles (Flop 5)</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <FlopCard title="Note Moyenne la Plus Basse" drivers={rankings.flopRating} kpi="averageRating" icon={<Star className="text-destructive"/>} isLowerBetter />
            <FlopCard title="Ponctualité la Plus Faible" drivers={rankings.flopPunctuality} kpi="punctualityRate" icon={<Clock className="text-destructive"/>} isLowerBetter />
            <FlopCard title="Taux de SCANBAC le Plus Faible" drivers={rankings.flopScanbac} kpi="scanbacRate" icon={<Smartphone className="text-destructive"/>} isLowerBetter />
            <FlopCard title="Taux de 'Sur Place Forcé' le Plus Élevé" drivers={rankings.flopForcedAddress} kpi="forcedAddressRate" icon={<MapPinOff className="text-destructive"/>} />
            <FlopCard title="Taux de 'Cmd. Forcées' le Plus Élevé" drivers={rankings.flopForcedContactless} kpi="forcedContactlessRate" icon={<Ban className="text-destructive"/>} />
        </div>
    </div>
  );
}


const FlopCard = ({ title, drivers, kpi, icon, isLowerBetter = false }: { title: string, drivers: DriverStats[], kpi: keyof DriverStats, icon: React.ReactNode, isLowerBetter?: boolean }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    {icon}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {drivers.length > 0 ? (
                    <ul className="space-y-2">
                        {drivers.map(driver => (
                            <li key={driver.name} className="flex justify-between items-center text-sm border-b pb-2 last:border-b-0">
                                <span className="font-medium">{driver.name}</span>
                                <Badge variant="destructive" className="font-mono">
                                    {(driver[kpi] as number)?.toFixed(kpi === 'averageRating' ? 2 : 1)}{kpi !== 'averageRating' ? '%' : ''}
                                </Badge>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-muted-foreground text-center text-sm py-4">Pas de données pour ce critère.</p>
                )}
            </CardContent>
        </Card>
    )
}
