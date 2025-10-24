
"use client";

import { useMemo } from "react";
import { useFilters } from "@/context/filter-context";
import { VerbatimsByCategoryChart } from "@/components/app/verbatims-by-category-chart";
import { VerbatimsByResponsibilityChart } from "@/components/app/verbatims-by-responsibility-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function VerbatimAnalysisPage() {
  const { processedVerbatims, isContextLoading } = useFilters();

  const analysisData = useMemo(() => {
    if (isContextLoading || !processedVerbatims) {
      return { byCategory: [], byResponsibility: [] };
    }

    const byCategory = Object.entries(
      processedVerbatims.reduce((acc, verbatim) => {
        const categories = Array.isArray(verbatim.category) ? verbatim.category : [verbatim.category];
        categories.forEach(cat => {
          if (cat) acc[cat] = (acc[cat] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    const byResponsibility = Object.entries(
      processedVerbatims.reduce((acc, verbatim) => {
        const responsibilities = Array.isArray(verbatim.responsibilities) ? verbatim.responsibilities : [verbatim.responsibilities];
        responsibilities.forEach(resp => {
          if (resp) acc[resp] = (acc[resp] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    return { byCategory, byResponsibility };
  }, [processedVerbatims, isContextLoading]);

  if (isContextLoading) {
    return (
      <main className="flex-1 container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Analyse des Verbatims Traités</CardTitle>
          <CardDescription>
            Répartition des verbatims détracteurs qui ont été analysés et catégorisés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <VerbatimsByCategoryChart data={analysisData.byCategory} />
            <VerbatimsByResponsibilityChart data={analysisData.byResponsibility} />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
