
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

export type CategorizedComment = {
  id: string;
  taskId: string;
  comment: string;
  rating: number;
  category: string;
  taskDate?: string;
  driverName?: string;
  status: "à traiter" | "traité";
};


export const categories = [
    "Attitude livreur",
    "Amabilité livreur",
    "Casse produit",
    "Manquant produit",
    "Manquant multiple",
    "Manquant bac",
    "Non livré",
    "Erreur de préparation",
    "Erreur de livraison",
    "Livraison en avance",
    "Livraison en retard",
    "Rupture chaine de froid",
    "Process",
    "Non pertinent",
    "Autre",
] as const;

interface CommentAnalysisProps {
  data: CategorizedComment[];
}

export function CommentAnalysis({ data }: CommentAnalysisProps) {
  const totalComments = data.length;
  
  const commentsByCategory = useMemo(() => {
    const grouped: Record<string, CategorizedComment[]> = {};
    for (const category of categories) {
      grouped[category] = [];
    }
    data.forEach((item) => {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      } else {
        grouped["Autre"].push(item);
      }
    });
    return Object.entries(grouped)
      .map(([category, comments]) => ({ category, comments }))
      .sort((a, b) => b.comments.length - a.comments.length);
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyse des Commentaires Clients</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {commentsByCategory.map(({ category, comments }) => {
          if (comments.length === 0) return null;
          const percentage = totalComments > 0 ? (comments.length / totalComments) * 100 : 0;
          return (
            <div key={category}>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {category}
                <Badge variant="secondary">{comments.length}</Badge>
                <Badge variant="outline">{percentage.toFixed(1)}%</Badge>
              </h3>
              <div className="mt-2 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/4">Chauffeur</TableHead>
                      <TableHead className="w-1/2">Commentaire</TableHead>
                      <TableHead className="w-1/4">Note</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comments.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.driverName || "N/A"}</TableCell>
                        <TableCell>{item.comment}</TableCell>
                        <TableCell>
                          <Badge variant={item.rating < 4 ? "destructive" : "default"}>
                            {item.rating} / 5
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === "traité" ? "default" : "destructive"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
