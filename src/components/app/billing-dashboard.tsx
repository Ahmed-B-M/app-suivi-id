
"use client";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Tournee } from "@/lib/types";
import type { BillingRule } from "@/app/billing/page";
import { Euro, FileSpreadsheet, GitCommitHorizontal, Scale, Building, Truck, Download } from "lucide-react";
import { Button } from "../ui/button";

export interface DetailedBillingInfo {
  round: Tournee;
  carrier: string;
  depot: string;
  store?: string;
  priceRule?: BillingRule;
  costRule?: BillingRule;
  price: number;
  cost: number;
}

export interface BillingData {
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
  details: DetailedBillingInfo[];
}

interface BillingDashboardProps {
  data: BillingData;
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
                value={`${summary.totalPrice.toFixed(2)} €`} 
                icon={<Euro className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
                title="Coût Total" 
                value={`${summary.totalCost.toFixed(2)} €`} 
                icon={<Euro className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
                title="Marge Totale" 
                value={`${summary.margin.toFixed(2)} €`} 
                icon={<Scale className="h-4 w-4 text-muted-foreground" />}
                variant={summary.margin >= 0 ? 'success' : 'danger'}
            />
            <StatCard 
                title="Marge / Tournée" 
                value={`${summary.averageMarginPerRound.toFixed(2)} €`} 
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
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet/>
              Détail de la Facturation par Tournée
            </CardTitle>
            <CardDescription>
              Liste détaillée de chaque tournée avec les règles de facturation appliquées.
            </CardDescription>
          </div>
          <Button onClick={onExport} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exporter en CSV
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[60vh] w-full">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Tournée</TableHead>
                  <TableHead>Transporteur</TableHead>
                  <TableHead>Dépôt / Entrepôt</TableHead>
                  <TableHead>Règle de Prix</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead>Règle de Coût</TableHead>
                  <TableHead className="text-right">Coût</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map(({ round, carrier, depot, store, priceRule, costRule, price, cost }) => (
                  <TableRow key={round.id}>
                    <TableCell className="font-medium">{round.name}</TableCell>
                    <TableCell>{carrier}</TableCell>
                    <TableCell>{store || depot}</TableCell>
                    <TableCell>
                      {priceRule ? (
                        <Badge variant="secondary">{`Cible: ${priceRule.targetType} - ${priceRule.targetValue}`}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Aucune</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{price > 0 ? `${price.toFixed(2)} €` : '-'}</TableCell>
                    <TableCell>
                       {costRule ? (
                        <Badge variant="outline">{`Cible: ${costRule.targetType} - ${costRule.targetValue}`}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Aucune</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{cost > 0 ? `${cost.toFixed(2)} €` : '-'}</TableCell>
                  </TableRow>
                ))}
                 {details.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Aucune donnée de facturation à afficher pour les filtres sélectionnés.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
