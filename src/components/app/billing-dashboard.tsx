
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building, Download, Euro, GitCommitHorizontal, Scale, Truck } from "lucide-react";
import { Button } from "../ui/button";

interface AggregatedCarrierData {
  name: string;
  totalPrice: number;
  totalCost: number;
  totalRounds: number;
  margin: number;
}

interface AggregatedEntityData {
  name: string;
  totalPrice: number;
  totalCost: number;
  totalRounds: number;
  margin: number;
  byCarrier: AggregatedCarrierData[];
}

export interface AggregatedData {
  summary: {
    totalPrice: number;
    totalCost: number;
    margin: number;
    totalRounds: number;
    averageMarginPerRound: number;
    roundsByEntity: [string, number][];
    roundsByCarrier: [string, number][];
    unassignedDrivers: string[];
  };
  details: AggregatedEntityData[];
}

interface BillingDashboardProps {
  data: AggregatedData;
  onExport: () => void;
}

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

const BreakdownCard = ({ title, data, icon, unit = "tournées" }: { title: string; data: [string, number][]; icon: React.ReactNode, unit?:string }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-40">
          <ul className="space-y-2">
            {data.map(([name, count]) => (
              <li key={name} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{name}</span>
                <span className="font-semibold">{count} {unit}</span>
              </li>
            ))}
            {data.length === 0 && <li className="text-center text-muted-foreground">Aucune donnée</li>}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};


export function BillingDashboard({ data, onExport }: BillingDashboardProps) {
  const { summary, details } = data;

  const formatCurrency = (value: number) => `${value.toFixed(2)} €`;

  return (
    <div className="space-y-8">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <StatCard 
                title="Tournées Facturées" 
                value={summary.totalRounds.toString()} 
                icon={<GitCommitHorizontal className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
                title="Prix Total" 
                value={formatCurrency(summary.totalPrice)} 
                icon={<Euro className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
                title="Coût Total" 
                value={formatCurrency(summary.totalCost)} 
                icon={<Euro className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
                title="Marge Totale" 
                value={formatCurrency(summary.margin)} 
                icon={<Scale className="h-4 w-4 text-muted-foreground" />}
                variant={summary.margin >= 0 ? 'success' : 'danger'}
            />
            <StatCard 
                title="Marge / Tournée" 
                value={formatCurrency(summary.averageMarginPerRound)} 
                icon={<Scale className="h-4 w-4 text-muted-foreground" />}
                variant={summary.averageMarginPerRound >= 0 ? 'success' : 'danger'}
            />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BreakdownCard title="Répartition par Entité" data={summary.roundsByEntity} icon={<Building className="text-muted-foreground"/>} />
            <BreakdownCard title="Répartition par Transporteur" data={summary.roundsByCarrier} icon={<Truck className="text-muted-foreground"/>} />
       </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Détail Agrégé par Entité</CardTitle>
            <CardDescription>
              Vue agrégée par dépôt/entrepôt et par transporteur.
            </CardDescription>
          </div>
          <Button onClick={onExport} variant="outline" size="sm" disabled>
            <Download className="mr-2 h-4 w-4" />
            Exporter en CSV (bientôt)
          </Button>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full space-y-4">
            {details.map((entity) => (
              <AccordionItem value={entity.name} key={entity.name} className="border-b-0">
                <Card>
                  <AccordionTrigger className="p-4 hover:no-underline">
                      <div className="w-full flex justify-between items-center text-lg font-semibold">
                          <span>{entity.name}</span>
                          <div className="flex items-center gap-6 text-sm text-right">
                              <div><div className="text-xs font-normal text-muted-foreground">Tournées</div>{entity.totalRounds}</div>
                              <div><div className="text-xs font-normal text-muted-foreground">Prix</div>{formatCurrency(entity.totalPrice)}</div>
                              <div><div className="text-xs font-normal text-muted-foreground">Coût</div>{formatCurrency(entity.totalCost)}</div>
                              <div className={entity.margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                                <div className="text-xs font-normal text-muted-foreground">Marge</div>{formatCurrency(entity.margin)}
                              </div>
                          </div>
                      </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-0 pt-0">
                      <div className="p-4 bg-muted/50">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-1/3">Transporteur</TableHead>
                              <TableHead className="text-right">Tournées</TableHead>
                              <TableHead className="text-right">Prix</TableHead>
                              <TableHead className="text-right">Coût</TableHead>
                              <TableHead className="text-right">Marge</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entity.byCarrier.map((carrier) => (
                              <TableRow key={carrier.name}>
                                <TableCell className="font-medium">{carrier.name}</TableCell>
                                <TableCell className="text-right">{carrier.totalRounds}</TableCell>
                                <TableCell className="text-right">{formatCurrency(carrier.totalPrice)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(carrier.totalCost)}</TableCell>
                                <TableCell className={`text-right font-semibold ${carrier.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(carrier.margin)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
            {details.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                    Aucune donnée agrégée à afficher.
                </div>
            )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
