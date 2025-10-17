
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
import { Star, Building, Truck, User, AlertTriangle, Percent, Hash, Search, Award, Clock, Smartphone, MapPinOff, Ban, ListTodo } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";
import { DriverStats } from "@/lib/scoring";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

// Data structures
interface DriverQuality extends DriverStats {
  score: number;
}

interface CarrierQuality extends Omit<DriverStats, 'name'|'totalTasks'|'completedTasks'> {
  name: string;
  totalRatings: number;
  totalAlerts: number;
  score: number;
  drivers: DriverQuality[];
}

interface DepotQuality extends Omit<DriverStats, 'name'|'totalTasks'|'completedTasks'> {
  name: string;
  totalRatings: number;
  totalAlerts: number;
  score: number;
  carriers: CarrierQuality[];
}

export interface QualityData {
  summary: {
    totalRatings: number;
    totalAlerts: number;
    alertRate: number;
    averageRating: number | null;
    punctualityRate: number | null;
    scanbacRate: number | null;
    forcedAddressRate: number | null;
    forcedContactlessRate: number | null;
    score: number;
  };
  details: DepotQuality[];
}

// Props
interface QualityDashboardProps {
  data: QualityData | null;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// Components
const StatCard = ({ title, value, icon, variant = 'default' }: { title: string, value: string, icon: React.ReactNode, variant?: 'default' | 'success' | 'danger' | 'warning' }) => {
    const valueColor = 
      variant === 'success' ? 'text-green-600' : 
      variant === 'danger' ? 'text-red-600' : 
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

const StatBadge = ({ value, icon, tooltipText, isRate=true, isLowerBetter=false }: { value: number | null, icon: React.ReactNode, tooltipText: string, isRate?: boolean, isLowerBetter?: boolean }) => {
  let variant: 'default' | 'secondary' | 'destructive' = 'secondary';
  if (value !== null) {
      if (isRate) {
          if (isLowerBetter) {
              if (value < 5) variant = 'default';
              else if (value < 15) variant = 'secondary';
              else variant = 'destructive';
          } else {
              if (value > 95) variant = 'default';
              else if (value > 85) variant = 'secondary';
              else variant = 'destructive';
          }
      } else { // For ratings
          if (value > 4.79) variant = 'default';
          else if (value > 4.5) variant = 'secondary';
          else variant = 'destructive';
      }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
            <Badge variant={variant} className="flex gap-1.5 min-w-[70px] justify-center">
              {icon} 
              {value !== null ? value.toFixed(isRate ? 1 : 2) : 'N/A'}
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


export function QualityDashboard({ data, isLoading, searchQuery, onSearchChange }: QualityDashboardProps) {
  const filteredDetails = useMemo(() => {
    if (!data?.details) return [];
    if (!searchQuery) return data.details;

    const lowerCaseQuery = searchQuery.toLowerCase();

    return data.details.map(depot => {
        const filteredCarriers = depot.carriers.map(carrier => {
            const filteredDrivers = carrier.drivers.filter(driver => 
                driver.name.toLowerCase().includes(lowerCaseQuery)
            );
            
            if (filteredDrivers.length > 0) {
                return { ...carrier, drivers: filteredDrivers };
            }
            if (carrier.name.toLowerCase().includes(lowerCaseQuery)) {
                return carrier;
            }
            return null;
        }).filter((c): c is CarrierQuality => c !== null);

        if (filteredCarriers.length > 0) {
            return { ...depot, carriers: filteredCarriers };
        }
        if (depot.name.toLowerCase().includes(lowerCaseQuery)) {
            return depot;
        }
        return null;
    }).filter((d): d is DepotQuality => d !== null);

  }, [data, searchQuery]);


  if (isLoading) {
    return (
       <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-96" />
        </div>
    );
  }

  if (!data || data.details.length === 0) {
    return (
      <Card className="flex items-center justify-center h-64">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <p>Aucune donnée de qualité à afficher pour la période sélectionnée.</p>
        </CardContent>
      </Card>
    );
  }

  const { summary } = data;
  
  const getVariant = (value: number | null, thresholds: { success: number, warning: number, isHigherBetter: boolean }): 'success' | 'warning' | 'danger' => {
    if (value === null) return 'danger';
    if (thresholds.isHigherBetter) {
      if (value >= thresholds.success) return 'success';
      if (value >= thresholds.warning) return 'warning';
    } else {
      if (value <= thresholds.success) return 'success';
      if (value <= thresholds.warning) return 'warning';
    }
    return 'danger';
  }

  return (
    <div className="space-y-8">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
                title="Nombre de notes" 
                value={summary.totalRatings.toString()} 
                icon={<Hash className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
                title="Note moyenne globale" 
                value={summary.averageRating?.toFixed(2) ?? 'N/A'}
                icon={<Star className="h-4 w-4 text-muted-foreground" />}
                variant={getVariant(summary.averageRating, {success: 4.8, warning: 4.5, isHigherBetter: true})}
            />
            <StatCard 
                title="Score moyen global" 
                value={summary.score?.toFixed(1) ?? 'N/A'}
                icon={<Award className="h-4 w-4 text-muted-foreground" />}
                 variant={getVariant(summary.score, {success: 80, warning: 60, isHigherBetter: true})}
            />
            <StatCard 
                title="Taux d'alerte (< 4★)" 
                value={`${summary.alertRate.toFixed(1)} %`} 
                icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                variant={getVariant(summary.alertRate, {success: 5, warning: 10, isHigherBetter: false})}
            />
       </div>

      <Card>
        <CardHeader>
          <CardTitle>Analyse Détaillée par Entité</CardTitle>
          <CardDescription>
            Explorez la performance qualité par dépôt, transporteur et livreur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par dépôt, transporteur, livreur..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          <Accordion type="multiple" className="w-full space-y-4">
            {filteredDetails.map((depot) => (
              <AccordionItem value={`depot-${depot.name}`} key={depot.name} className="border-b-0">
                <Card>
                  <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                      <div className="w-full flex justify-between items-center">
                          <span className="flex items-center gap-3"><Building />{depot.name}</span>
                          <div className="flex items-center gap-2 text-sm font-medium">
                              <StatBadge value={depot.score} icon={<Award />} tooltipText="Score Moyen" isRate={false}/>
                              <StatBadge value={depot.averageRating} icon={<Star />} tooltipText="Note Moyenne" isRate={false} />
                              <StatBadge value={depot.punctualityRate} icon={<Clock />} tooltipText="Ponctualité" />
                              <StatBadge value={depot.scanbacRate} icon={<Smartphone />} tooltipText="SCANBAC" />
                              <StatBadge value={depot.forcedAddressRate} icon={<MapPinOff />} tooltipText="Sur Place Forcé" isLowerBetter={true} />
                              <StatBadge value={depot.forcedContactlessRate} icon={<Ban />} tooltipText="Cmd. Forcées" isLowerBetter={true} />
                          </div>
                      </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-0 pt-0">
                      <div className="p-4 bg-muted/30">
                        <Accordion type="multiple" className="w-full space-y-3">
                          {depot.carriers.map(carrier => (
                            <AccordionItem value={`carrier-${carrier.name}`} key={carrier.name} className="border-b-0">
                                <Card>
                                  <AccordionTrigger className="p-3 hover:no-underline font-semibold">
                                     <div className="w-full flex justify-between items-center">
                                          <span className="flex items-center gap-3"><Truck />{carrier.name}</span>
                                          <div className="flex items-center gap-2 text-sm font-medium">
                                              <StatBadge value={carrier.score} icon={<Award />} tooltipText="Score Moyen" isRate={false}/>
                                              <StatBadge value={carrier.averageRating} icon={<Star />} tooltipText="Note Moyenne" isRate={false} />
                                              <StatBadge value={carrier.punctualityRate} icon={<Clock />} tooltipText="Ponctualité" />
                                              <StatBadge value={carrier.scanbacRate} icon={<Smartphone />} tooltipText="SCANBAC" />
                                          </div>
                                      </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="p-0 pt-0">
                                     <div className="p-3 bg-muted/20">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead><User className="h-4 w-4 inline-block mr-1"/>Livreur</TableHead>
                                              <TableHead className="text-right"><Award className="h-4 w-4 inline-block mr-1"/>Score</TableHead>
                                              <TableHead className="text-right"><Star className="h-4 w-4 inline-block mr-1"/>Note Moy.</TableHead>
                                              <TableHead className="text-right"><Clock className="h-4 w-4 inline-block mr-1"/>Ponctualité</TableHead>
                                              <TableHead className="text-right"><Smartphone className="h-4 w-4 inline-block mr-1"/>SCANBAC</TableHead>
                                              <TableHead className="text-right"><MapPinOff className="h-4 w-4 inline-block mr-1"/>Sur Place Forcé</TableHead>
                                              <TableHead className="text-right"><Ban className="h-4 w-4 inline-block mr-1"/>Cmd. Forcées</TableHead>
                                              <TableHead className="text-right"><ListTodo className="h-4 w-4 inline-block mr-1"/>Tâches</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {carrier.drivers.map(driver => (
                                              <TableRow key={driver.name}>
                                                <TableCell className="font-medium">{driver.name}</TableCell>
                                                <TableCell className="text-right font-bold">{driver.score.toFixed(1)}</TableCell>
                                                <TableCell className="text-right">{driver.averageRating?.toFixed(2) ?? 'N/A'}</TableCell>
                                                <TableCell className="text-right">{driver.punctualityRate?.toFixed(1) ?? 'N/A'}%</TableCell>
                                                <TableCell className="text-right">{driver.scanbacRate?.toFixed(1) ?? 'N/A'}%</TableCell>
                                                <TableCell className="text-right">{driver.forcedAddressRate?.toFixed(1) ?? 'N/A'}%</TableCell>
                                                <TableCell className="text-right">{driver.forcedContactlessRate?.toFixed(1) ?? 'N/A'}%</TableCell>
                                                <TableCell className="text-right">{driver.completedTasks}</TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                  </AccordionContent>
                                </Card>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
             {filteredDetails.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    Aucun résultat pour "{searchQuery}"
                </div>
             )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
