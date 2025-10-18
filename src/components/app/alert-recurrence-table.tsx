"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star, Building, Truck, User, AlertTriangle, Hash } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { categories } from "./comment-analysis";

type DriverAlertData = {
    name: string;
    alertCount: number;
    totalRatings: number;
    averageRating: number | null;
    commentCategories: Record<string, number>;
}

type CarrierAlertData = {
    name: string;
    drivers: DriverAlertData[];
}

export type AlertData = {
    name: string;
    carriers: CarrierAlertData[];
}

interface AlertRecurrenceTableProps {
    data: AlertData[];
    isLoading: boolean;
}

const CategoryPill = ({ category, count }: { category: string, count: number }) => {
    return (
        <div className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-xs">
            <span className="font-medium">{category}</span>
            <Badge variant="destructive" className="h-4 w-4 flex items-center justify-center p-0">{count}</Badge>
        </div>
    )
}

export function AlertRecurrenceTable({ data, isLoading }: AlertRecurrenceTableProps) {
    if (isLoading) {
        return <Skeleton className="h-96 w-full" />
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="text-destructive"/>
                        Récurrence des Alertes Qualité
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">Aucune alerte qualité (note &lt; 4) à analyser pour cette période.</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-destructive"/>
                    Récurrence des Alertes Qualité (note &lt; 4)
                </CardTitle>
                <CardDescription>
                    Analyse des livreurs ayant reçu des notes inférieures à 4, regroupés par dépôt et transporteur.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" className="w-full space-y-4">
                    {data.map(depot => (
                        <AccordionItem value={depot.name} key={depot.name} className="border-b-0">
                            <Card>
                                <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                                    <div className="w-full flex justify-between items-center">
                                        <span className="flex items-center gap-3"><Building />{depot.name}</span>
                                        <Badge variant="destructive">{depot.carriers.reduce((sum, c) => sum + c.drivers.reduce((s,d) => s + d.alertCount, 0), 0)} alertes</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-0 pt-0">
                                     <div className="p-4 bg-muted/30">
                                        <Accordion type="multiple" className="w-full space-y-3">
                                            {depot.carriers.map(carrier => (
                                                <AccordionItem value={carrier.name} key={carrier.name} className="border-b-0">
                                                     <Card>
                                                        <AccordionTrigger className="p-3 hover:no-underline font-semibold">
                                                            <div className="w-full flex justify-between items-center">
                                                                <span className="flex items-center gap-3"><Truck />{carrier.name}</span>
                                                                <Badge variant="destructive">{carrier.drivers.reduce((s,d) => s + d.alertCount, 0)} alertes</Badge>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="p-0 pt-0">
                                                             <div className="p-3 bg-background">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead><User className="h-4 w-4 inline-block mr-1"/>Livreur</TableHead>
                                                                            <TableHead className="text-center w-24"><AlertTriangle className="h-4 w-4 inline-block mr-1"/>Alertes</TableHead>
                                                                            <TableHead className="text-center w-24"><Star className="h-4 w-4 inline-block mr-1"/>Note Moy.</TableHead>
                                                                            <TableHead className="text-center w-24"><Hash className="h-4 w-4 inline-block mr-1"/>Total Notes</TableHead>
                                                                            <TableHead>Catégories des Commentaires</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {carrier.drivers.map(driver => (
                                                                            <TableRow key={driver.name}>
                                                                                <TableCell className="font-medium">{driver.name}</TableCell>
                                                                                <TableCell className="text-center font-bold text-destructive">{driver.alertCount}</TableCell>
                                                                                <TableCell className="text-center font-mono">{driver.averageRating?.toFixed(2) ?? 'N/A'}</TableCell>
                                                                                <TableCell className="text-center font-mono">{driver.totalRatings}</TableCell>
                                                                                <TableCell>
                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        {Object.entries(driver.commentCategories).sort((a,b) => b[1] - a[1]).map(([cat, count]) => (
                                                                                            <CategoryPill key={cat} category={cat} count={count} />
                                                                                        ))}
                                                                                    </div>
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
                                        </Accordion>
                                     </div>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    )
}
