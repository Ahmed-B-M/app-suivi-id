
"use client";

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
import { Star, Building, Truck, User, MessageSquare, AlertTriangle, Percent, Hash } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { format } from "date-fns";

// Data structures
interface Rating {
  rating: number;
  comment: string | null;
  date?: string;
  taskId: string;
}

interface DriverQuality {
  name: string;
  totalRatings: number;
  totalAlerts: number;
  avgRating: number;
  ratings: Rating[];
}

interface CarrierQuality {
  name: string;
  totalRatings: number;
  totalAlerts: number;
  avgRating: number;
  drivers: DriverQuality[];
}

interface DepotQuality {
  name: string;
  totalRatings: number;
  totalAlerts: number;
  avgRating: number;
  carriers: CarrierQuality[];
}

export interface QualityData {
  summary: {
    totalRatings: number;
    totalAlerts: number;
    avgRating: number;
    alertRate: number;
  };
  details: DepotQuality[];
}

// Props
interface QualityDashboardProps {
  data: QualityData | null;
  isLoading: boolean;
}

// Components
const StatCard = ({ title, value, icon, variant = 'default' }: { title: string, value: string, icon: React.ReactNode, variant?: 'default' | 'success' | 'danger' }) => {
    const valueColor = variant === 'success' ? 'text-green-600' : variant === 'danger' ? 'text-red-600' : '';
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


export function QualityDashboard({ data, isLoading }: QualityDashboardProps) {
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
          <p>Aucune note trouvée pour la période et les filtres sélectionnés.</p>
        </CardContent>
      </Card>
    );
  }

  const { summary, details } = data;

  return (
    <div className="space-y-8">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
                title="Nombre de notes" 
                value={summary.totalRatings.toString()} 
                icon={<Hash className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
                title="Note moyenne" 
                value={summary.avgRating.toFixed(2)} 
                icon={<Star className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
                title="Alertes Qualité (<4)" 
                value={summary.totalAlerts.toString()} 
                icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                variant={summary.totalAlerts > 0 ? 'danger' : 'default'}
            />
            <StatCard 
                title="Taux d'alerte" 
                value={`${summary.alertRate.toFixed(2)} %`} 
                icon={<Percent className="h-4 w-4 text-muted-foreground" />}
                variant={summary.alertRate > 5 ? 'danger' : (summary.alertRate > 2 ? 'default' : 'success')}
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
          <Accordion type="multiple" className="w-full space-y-4">
            {details.map((depot) => (
              <AccordionItem value={`depot-${depot.name}`} key={depot.name} className="border-b-0">
                <Card>
                  <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                      <div className="w-full flex justify-between items-center">
                          <span className="flex items-center gap-3"><Building />{depot.name}</span>
                          <div className="flex items-center gap-4 text-sm font-medium">
                              <Badge variant={depot.avgRating >= 4.5 ? 'default' : 'destructive'} className="flex gap-2"><Star className="h-4 w-4"/> {depot.avgRating.toFixed(2)}</Badge>
                              <span>{depot.totalRatings} notes</span>
                              <span className="text-destructive">{depot.totalAlerts} alertes</span>
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
                                          <div className="flex items-center gap-4 text-sm font-medium">
                                               <Badge variant={carrier.avgRating >= 4.5 ? 'secondary' : 'destructive'} className="flex gap-2"><Star className="h-4 w-4"/> {carrier.avgRating.toFixed(2)}</Badge>
                                              <span>{carrier.totalRatings} notes</span>
                                              <span className="text-destructive">{carrier.totalAlerts} alertes</span>
                                          </div>
                                      </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="p-0 pt-0">
                                     <div className="p-3 bg-muted/20">
                                        <Accordion type="multiple" className="w-full space-y-2">
                                          {carrier.drivers.map(driver => (
                                             <AccordionItem value={`driver-${driver.name}`} key={driver.name} className="border-b-0">
                                                 <Card className="bg-background">
                                                    <AccordionTrigger className="p-2 hover:no-underline text-sm font-medium">
                                                       <div className="w-full flex justify-between items-center">
                                                            <span className="flex items-center gap-2"><User />{driver.name}</span>
                                                            <div className="flex items-center gap-3 text-xs font-medium">
                                                                <Badge variant={driver.avgRating >= 4.5 ? 'outline' : 'destructive'} className="flex gap-1.5"><Star className="h-3 w-3"/> {driver.avgRating.toFixed(2)}</Badge>
                                                                <span>{driver.totalRatings} notes</span>
                                                                <span className="text-destructive">{driver.totalAlerts} alertes</span>
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="p-2">
                                                        <Table>
                                                          <TableHeader>
                                                            <TableRow>
                                                              <TableHead className="w-[100px]">Date</TableHead>
                                                              <TableHead className="w-[80px]">Note</TableHead>
                                                              <TableHead>Commentaire</TableHead>
                                                            </TableRow>
                                                          </TableHeader>
                                                          <TableBody>
                                                            {driver.ratings.map(r => (
                                                              <TableRow key={r.taskId}>
                                                                <TableCell>{r.date ? format(new Date(r.date), 'dd/MM/yy') : 'N/A'}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={r.rating < 4 ? 'destructive' : 'default'} className="text-base">{r.rating}</Badge>
                                                                </TableCell>
                                                                <TableCell className="text-muted-foreground italic">
                                                                    {r.comment ? `"${r.comment}"` : "Aucun commentaire"}
                                                                </TableCell>
                                                              </TableRow>
                                                            ))}
                                                          </TableBody>
                                                        </Table>
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
                        </Accordion>
                      </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
