
"use client";

import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star, Building, Truck, User, AlertTriangle, Percent, Hash, Search, Award, Clock, Smartphone, MapPinOff, Ban, ListTodo, BarChart, TimerOff } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";
import { DriverStats } from "@/lib/scoring";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn } from "@/lib/utils";

// Data structures
interface DriverQuality extends DriverStats {
  score: number;
  npsScore: number | null;
}

interface CarrierQuality extends Omit<DriverStats, 'name'|'totalTasks'|'completedTasks'|'score'> {
  name: string;
  totalRatings: number;
  drivers: DriverQuality[];
  npsScore: number | null;
}

interface DepotQuality extends Omit<DriverStats, 'name'|'totalTasks'|'completedTasks'|'score'> {
  name: string;
  totalRatings: number;
  carriers: CarrierQuality[];
  npsScore: number | null;
}

export interface QualityData {
  summary: {
    totalRatings: number;
    averageRating: number | null;
    punctualityRate: number | null;
    scanbacRate: number | null;
    forcedAddressRate: number | null;
    forcedContactlessRate: number | null;
    lateOver1hRate: number | null;
    npsScore: number | null;
  };
  details: DepotQuality[];
}

// Props
interface QualityDashboardProps {
  data: QualityData | null;
  isLoading: boolean;
}

// Components
const StatCard = ({ title, value, icon, variant = 'default' }: { title: string, value: string, icon: React.ReactNode, variant?: 'default' | 'success' | 'danger' | 'warning' }) => {
    const valueColor = 
      variant === 'success' ? 'text-primary' : 
      variant === 'danger' ? 'text-destructive' : 
      variant === 'warning' ? 'text-orange-500' : '';
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
            </CardContent>
        </Card>
    )
};

const StatBadge = ({ value, icon, tooltipText, isRate = true, isLowerBetter = false, isNps = false }: { value: number | null, icon: React.ReactNode, tooltipText: string, isRate?: boolean, isLowerBetter?: boolean, isNps?: boolean }) => {
  let colorClass = "bg-secondary text-secondary-foreground";
  
  if (value !== null) {
    if (isNps) {
        if (value >= 50) colorClass = "bg-primary text-primary-foreground";
        else if (value >= 0) colorClass = "bg-yellow-500 text-black";
        else colorClass = "bg-destructive text-destructive-foreground";
    } else if (isRate) { // For percentage-based rates
      if (isLowerBetter) { // Lower is better (e.g., forced address rate)
        if (value <= 2) colorClass = "bg-primary text-primary-foreground";
        else if (value <= 5) colorClass = "bg-accent text-accent-foreground";
        else if (value <= 10) colorClass = "bg-yellow-500 text-black";
        else if (value <= 15) colorClass = "bg-orange-500 text-white";
        else colorClass = "bg-destructive text-destructive-foreground";
      } else { // Higher is better (e.g., punctuality)
        if (value >= 98) colorClass = "bg-primary text-primary-foreground";
        else if (value >= 95) colorClass = "bg-accent text-accent-foreground";
        else if (value >= 90) colorClass = "bg-yellow-500 text-black";
        else if (value >= 85) colorClass = "bg-orange-500 text-white";
        else colorClass = "bg-destructive text-destructive-foreground";
      }
    } else { // For ratings (not a rate, scale of 1-5)
      if (value >= 4.9) colorClass = "bg-primary text-primary-foreground";
      else if (value >= 4.8) colorClass = "bg-accent text-accent-foreground";
      else if (value >= 4.5) colorClass = "bg-yellow-500 text-black";
      else if (value >= 4.0) colorClass = "bg-orange-500 text-white";
      else colorClass = "bg-destructive text-destructive-foreground";
    }
  }


  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
            <Badge className={cn("flex gap-1.5 min-w-[70px] justify-center border-transparent", colorClass)}>
              {icon} 
              {value !== null ? value.toFixed(isNps ? 1 : isRate ? 1 : 2) : 'N/A'}
              {isRate && '%'}
            </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const getScoreVariant = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 75) return 'default';
    if (score >= 60) return 'warning';
    return 'danger';
}

const RowSummary = ({ name, data, icon }: { name: string, data: any, icon: React.ReactNode }) => (
    <div className="flex items-center w-full p-2">
        <div className="flex-1 flex items-center gap-2 font-semibold">
            {icon} {name}
        </div>
        <div className="flex items-center gap-2">
            <StatBadge value={data.averageRating} icon={<Star />} tooltipText="Note Moyenne" isRate={false} />
            <StatBadge value={data.npsScore} icon={<BarChart />} tooltipText="Score NPS" isNps={true} />
            <StatBadge value={data.punctualityRate} icon={<Clock />} tooltipText="Taux de Ponctualité" />
            <StatBadge value={data.scanbacRate} icon={<Smartphone />} tooltipText="Taux de SCANBAC" />
            <StatBadge value={data.forcedAddressRate} icon={<MapPinOff />} tooltipText="Taux 'Sur Place Forcé'" isLowerBetter />
            <StatBadge value={data.forcedContactlessRate} icon={<Ban />} tooltipText="Taux 'Cmd. Forcées'" isLowerBetter />
            <StatBadge value={data.lateOver1hRate} icon={<TimerOff />} tooltipText="Taux de Retard > 1h" isLowerBetter />
            <Badge variant="outline" className="h-7">{data.totalRatings} notes</Badge>
        </div>
    </div>
);

const DriverTable = ({ drivers }: { drivers: DriverQuality[] }) => (
    <div className="px-4 py-2">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Livreur</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Note Moy.</TableHead>
                    <TableHead className="text-right">NPS</TableHead>
                    <TableHead className="text-right">Ponctualité</TableHead>
                    <TableHead className="text-right">SCANBAC</TableHead>
                    <TableHead className="text-right">Forçage Adr.</TableHead>
                    <TableHead className="text-right">Forçage Cmd.</TableHead>
                    <TableHead className="text-right">Retard > 1h</TableHead>
                    <TableHead className="text-right">Notes</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {drivers.map(driver => (
                    <TableRow key={driver.name}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell className="text-right font-bold"><Badge variant={getScoreVariant((driver.score ?? 0) / 20)}>{driver.score?.toFixed(1)}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{driver.averageRating?.toFixed(2) ?? 'N/A'}</TableCell>
                        <TableCell className="text-right font-mono">{driver.npsScore?.toFixed(1) ?? 'N/A'}</TableCell>
                        <TableCell className="text-right font-mono">{driver.punctualityRate?.toFixed(1) ?? 'N/A'}%</TableCell>
                        <TableCell className="text-right font-mono">{driver.scanbacRate?.toFixed(1) ?? 'N/A'}%</TableCell>
                        <TableCell className="text-right font-mono">{driver.forcedAddressRate?.toFixed(1) ?? 'N/A'}%</TableCell>
                        <TableCell className="text-right font-mono">{driver.forcedContactlessRate?.toFixed(1) ?? 'N/A'}%</TableCell>
                        <TableCell className="text-right font-mono">{driver.lateOver1hRate?.toFixed(1) ?? 'N/A'}%</TableCell>
                        <TableCell className="text-right font-mono">{driver.totalRatings}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
);


export function QualityDashboard({ data, isLoading }: QualityDashboardProps) {

    if (isLoading) {
        return <Skeleton className="h-96 w-full" />;
    }

    if (!data || data.details.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Synthèse de la Qualité</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">Aucune donnée de qualité à analyser pour cette période.</p>
                </CardContent>
            </Card>
        );
    }
    
    const getRatingVariant = (score: number | null) => {
        if(score === null) return 'danger';
        if (score >= 4.8) return 'success';
        if (score >= 4.5) return 'warning';
        return 'danger';
    };

    const getNpsVariant = (score: number | null) => {
        if(score === null) return 'danger';
        if (score >= 50) return 'success'; // Target
        if (score >= 0) return 'warning';
        return 'danger';
    };

    const getPunctualityVariant = (score: number | null) => {
        if(score === null) return 'danger';
        if (score >= 95) return 'success';
        if (score >= 90) return 'warning';
        return 'danger';
    }
    
    const getForcedVariant = (score: number | null) => {
        if(score === null) return 'danger';
        if (score <= 5) return 'success';
        if (score <= 10) return 'warning';
        return 'danger';
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>Synthèse de la Qualité</CardTitle>
                <CardDescription>Vue d'ensemble des indicateurs de performance qualité, agrégés par dépôt et transporteur.</CardDescription>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4 pt-4">
                    <StatCard title="Note Moyenne Globale" value={data.summary.averageRating?.toFixed(2) ?? 'N/A'} icon={<Star />} variant={getRatingVariant(data.summary.averageRating)} />
                    <StatCard title="Score NPS Global" value={data.summary.npsScore?.toFixed(1) ?? 'N/A'} icon={<BarChart />} variant={getNpsVariant(data.summary.npsScore)} />
                    <StatCard title="Ponctualité" value={`${data.summary.punctualityRate?.toFixed(1) ?? 'N/A'}%`} icon={<Clock />} variant={getPunctualityVariant(data.summary.punctualityRate)} />
                    <StatCard title="SCANBAC" value={`${data.summary.scanbacRate?.toFixed(1) ?? 'N/A'}%`} icon={<Smartphone />} variant={getPunctualityVariant(data.summary.scanbacRate)} />
                    <StatCard title="Forçage Adresse" value={`${data.summary.forcedAddressRate?.toFixed(1) ?? 'N/A'}%`} icon={<MapPinOff />} variant={getForcedVariant(data.summary.forcedAddressRate)} />
                    <StatCard title="Forçage Sans Contact" value={`${data.summary.forcedContactlessRate?.toFixed(1) ?? 'N/A'}%`} icon={<Ban />} variant={getForcedVariant(data.summary.forcedContactlessRate)} />
                    <StatCard title="Retard > 1h" value={`${data.summary.lateOver1hRate?.toFixed(1) ?? 'N/A'}%`} icon={<TimerOff />} variant={getForcedVariant(data.summary.lateOver1hRate)} />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {data.details.map(depot => (
                    <Card key={depot.name}>
                        <Accordion type="single" collapsible>
                             <AccordionItem value={depot.name} className="border-none">
                                <AccordionTrigger className="p-0 hover:no-underline">
                                    <RowSummary name={depot.name} data={depot} icon={<Building />} />
                                </AccordionTrigger>
                                <AccordionContent className="space-y-2">
                                    {depot.carriers.map(carrier => (
                                        <div key={carrier.name} className="ml-6 border-l-2 pl-4">
                                            <RowSummary name={carrier.name} data={carrier} icon={<Truck />} />
                                            <DriverTable drivers={carrier.drivers} />
                                        </div>
                                    ))}
                                </AccordionContent>
                             </AccordionItem>
                        </Accordion>
                    </Card>
                ))}
            </CardContent>
        </Card>
    );
}
