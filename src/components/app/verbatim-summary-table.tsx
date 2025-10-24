
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
import { MessageSquareQuote } from "lucide-react";

interface VerbatimAnalysisData {
    total: number;
    byResponsibility: { name: string; count: number; percentage: number; }[];
    byCategory: { name: string; count: number; percentage: number; }[];
}

interface VerbatimSummaryTableProps {
  analysis: VerbatimAnalysisData;
}

export function VerbatimSummaryTable({ analysis }: VerbatimSummaryTableProps) {
  if (!analysis || analysis.total === 0) {
    return null; // Don't render the card if there's no data
  }
  
  const top10Categories = analysis.byCategory.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <MessageSquareQuote className="h-6 w-6 text-primary"/>
            Récapitulatif des Verbatims Traités
        </CardTitle>
        <CardDescription>
          Analyse des {analysis.total} verbatims détracteurs qui ont été catégorisés.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-semibold mb-3 text-center">Répartition par Responsabilité</h3>
           <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Responsable</TableHead>
                        <TableHead className="text-right">Nombre</TableHead>
                        <TableHead className="text-right">Pourcentage</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {analysis.byResponsibility.map((resp) => (
                        <TableRow key={resp.name}>
                            <TableCell className="font-medium">{resp.name}</TableCell>
                            <TableCell className="text-right">{resp.count}</TableCell>
                            <TableCell className="text-right">
                                <Badge variant="secondary">{resp.percentage.toFixed(1)}%</Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
        <div>
           <h3 className="font-semibold mb-3 text-center">Top 10 des Catégories</h3>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Catégorie</TableHead>
                        <TableHead className="text-right">Nombre</TableHead>
                        <TableHead className="text-right">Pourcentage</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {top10Categories.map((cat) => (
                        <TableRow key={cat.name}>
                            <TableCell className="font-medium">{cat.name}</TableCell>
                            <TableCell className="text-right">{cat.count}</TableCell>
                            <TableCell className="text-right">
                                <Badge variant="secondary">{cat.percentage.toFixed(1)}%</Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
