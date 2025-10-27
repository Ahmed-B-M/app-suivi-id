
"use client";

import { useState, useMemo } from "react";
import { useFilters } from "@/context/filter-context";
import { calculateDashboardStats } from "@/lib/stats-calculator";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DepotStats {
  name: string;
  stats: ReturnType<typeof calculateDashboardStats>['stats'];
}

const KpiCard = ({ title, data, kpi, unit = '%', isHigherBetter = true }: { title: string, data: DepotStats[], kpi: keyof DepotStats['stats'], unit?: string, isHigherBetter?: boolean }) => {
    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            const valA = a.stats ? a.stats[kpi] as number : (isHigherBetter ? -Infinity : Infinity);
            const valB = b.stats ? b.stats[kpi] as number : (isHigherBetter ? -Infinity : Infinity);
            if (valA === null) return 1;
            if (valB === null) return -1;
            return isHigherBetter ? valB - valA : valA - valB;
        });
    }, [data, kpi, isHigherBetter]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {sortedData.map((depot, index) => {
                        const value = depot.stats ? depot.stats[kpi] as number : null;
                        return (
                            <li key={depot.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {index === 0 ? <Crown className="h-5 w-5 text-yellow-500" /> : <span className="w-5 text-center text-muted-foreground font-semibold">{index + 1}</span>}
                                    <span className="font-medium">{depot.name}</span>
                                </div>
                                <Badge variant={index === 0 ? "default" : "secondary"}>
                                    {value !== null ? `${value.toFixed(2)}${unit}` : 'N/A'}
                                </Badge>
                            </li>
                        );
                    })}
                </ul>
            </CardContent>
        </Card>
    )
}

export default function ComparisonPage() {
    const { availableDepots, allTasks, allRounds, allComments, allNpsData, processedVerbatims, isContextLoading } = useFilters();
    const [selectedDepots, setSelectedDepots] = useState<string[]>([]);

    const handleDepotSelectionChange = (depot: string, checked: boolean) => {
        setSelectedDepots(prev =>
            checked ? [...prev, depot] : prev.filter(d => d !== depot)
        );
    };

    const comparisonData: DepotStats[] = useMemo(() => {
        if (selectedDepots.length === 0 || isContextLoading) {
            return [];
        }

        return selectedDepots.map(depotName => {
            const stats = calculateDashboardStats(
                allTasks,
                allRounds,
                allComments,
                allNpsData,
                processedVerbatims,
                'entrepot', // Simulate filtering for a specific depot
                depotName,
                'all'
            );
            return {
                name: depotName,
                stats: stats.stats,
            };
        });
    }, [selectedDepots, allTasks, allRounds, allComments, allNpsData, processedVerbatims, isContextLoading]);

    return (
        <main className="container mx-auto py-8 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Analyse Comparative des Dépôts</CardTitle>
                    <CardDescription>
                        Sélectionnez les dépôts que vous souhaitez comparer sur les indicateurs de performance clés.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {availableDepots.map(depot => (
                            <div key={depot} className="flex items-center space-x-2">
                                <Checkbox
                                    id={depot}
                                    checked={selectedDepots.includes(depot)}
                                    onCheckedChange={(checked) => handleDepotSelectionChange(depot, !!checked)}
                                />
                                <Label htmlFor={depot} className="font-medium cursor-pointer">{depot}</Label>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {isContextLoading && selectedDepots.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                </div>
            )}


            {!isContextLoading && selectedDepots.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <KpiCard title="Taux d'échec" data={comparisonData} kpi="failedDeliveryRate" isHigherBetter={false} />
                    <KpiCard title="Ponctualité" data={comparisonData} kpi="punctualityRate" />
                    <KpiCard title="Note Moyenne" data={comparisonData} kpi="averageRating" unit="" />
                    <KpiCard title="Score NPS" data={comparisonData} kpi="nps" unit="" />
                    <KpiCard title="Taux de SCANBAC" data={comparisonData} kpi="scanbacRate" />
                    <KpiCard title="Taux d'Alertes Qualité" data={comparisonData} kpi="alertRate" isHigherBetter={false} />
                    <KpiCard title="Taux de Participation (Notes)" data={comparisonData} kpi="ratingRate" />
                    <KpiCard title="Taux de Retard > 1h" data={comparisonData} kpi="lateOver1hRate" isHigherBetter={false} />
                </div>
            )}
        </main>
    );
}

