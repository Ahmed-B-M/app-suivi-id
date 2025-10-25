
"use client";

import { useMemo } from "react";
import { useFilters } from "@/context/filter-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface CategoryData {
  name: string;
  count: number;
  percentage: number;
}

interface ResponsibilityData {
  name: string;
  count: number;
  percentage: number;
  categories: CategoryData[];
}

export default function VerbatimAnalysisPage() {
  const { allProcessedVerbatims, isContextLoading } = useFilters();

  const analysisData: ResponsibilityData[] = useMemo(() => {
    const verbatimsToShow = allProcessedVerbatims.filter(v => v.status === 'traité');

    if (isContextLoading || !verbatimsToShow || verbatimsToShow.length === 0) {
      return [];
    }

    const totalUniqueVerbatims = verbatimsToShow.length;
    const byResponsibility: Record<string, { verbatims: Set<string>; categories: Record<string, number> }> = {};

    verbatimsToShow.forEach((verbatim) => {
      const responsibilities = Array.isArray(verbatim.responsibilities) && verbatim.responsibilities.length > 0
        ? [...new Set(verbatim.responsibilities.filter(r => r && typeof r === 'string'))]
        : ["Inconnu"];
        
      const categories = Array.isArray(verbatim.category) && verbatim.category.length > 0
        ? [...new Set(verbatim.category.filter(c => c && typeof c === 'string'))]
        : ["Non catégorisé"];

      responsibilities.forEach(resp => {
        if (!byResponsibility[resp]) {
            byResponsibility[resp] = { verbatims: new Set(), categories: {} };
        }
        byResponsibility[resp].verbatims.add(verbatim.taskId);

        categories.forEach(cat => {
            byResponsibility[resp].categories[cat] = (byResponsibility[resp].categories[cat] || 0) + 1;
        });
      });
    });

    return Object.entries(byResponsibility)
      .map(([respName, data]) => {
        const uniqueVerbatimCount = data.verbatims.size;
        
        const categoriesData = Object.entries(data.categories)
          .map(([catName, catCount]) => ({
            name: catName,
            count: catCount,
            percentage: uniqueVerbatimCount > 0 ? (catCount / uniqueVerbatimCount) * 100 : 0,
          }))
          .sort((a, b) => b.count - a.count);

        return {
          name: respName,
          count: uniqueVerbatimCount, // This is the count of unique verbatims for this responsibility
          percentage: (uniqueVerbatimCount / totalUniqueVerbatims) * 100,
          categories: categoriesData,
        };
      })
      .sort((a, b) => b.count - a.count);

  }, [allProcessedVerbatims, isContextLoading]);

  if (isContextLoading) {
    return (
      <main className="flex-1 container py-8">
        <Skeleton className="h-[400px] w-full" />
      </main>
    );
  }

  return (
    <main className="flex-1 container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Analyse des Verbatims Traités</CardTitle>
          <CardDescription>
            Répartition des verbatims détracteurs qui ont été analysés et
            catégorisés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analysisData.length === 0 ? (
             <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Aucune donnée de verbatim traité pour la période sélectionnée.</p>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full space-y-2">
              {analysisData.map((resp) => (
                <AccordionItem value={resp.name} key={resp.name} className="border rounded-md px-4">
                  <AccordionTrigger className="py-4 text-lg font-semibold hover:no-underline">
                     <div className="flex justify-between items-center w-full pr-2">
                        <span>{resp.name}</span>
                        <div className="flex items-center gap-4">
                            <Badge variant="outline">{resp.count} verbatims</Badge>
                            <Badge variant="default">{resp.percentage.toFixed(1)}%</Badge>
                        </div>
                     </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Catégorie</TableHead>
                                <TableHead className="text-right">Nombre</TableHead>
                                <TableHead className="text-right w-[120px]">Pourcentage</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {resp.categories.map(cat => (
                                <TableRow key={cat.name}>
                                    <TableCell>{cat.name}</TableCell>
                                    <TableCell className="text-right">{cat.count}</TableCell>
                                    <TableCell className="text-right font-medium">{cat.percentage.toFixed(1)}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
