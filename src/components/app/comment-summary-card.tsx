
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircleWarning, User, Calendar, Route } from "lucide-react";
import { format } from "date-fns";

export interface CommentAnalysisData {
  totalComments: number;
  commentsByCategory: {
    category: string;
    count: number;
    percentage: number;
  }[];
  attitudeComments: {
    comment: string;
    driverName?: string;
    taskDate?: string;
    roundName?: string;
  }[];
}

interface CommentSummaryCardProps {
  analysis: CommentAnalysisData;
}

export function CommentSummaryCard({ analysis }: CommentSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <MessageCircleWarning className="h-6 w-6 text-primary"/>
            Synthèse des Commentaires Négatifs
        </CardTitle>
        <CardDescription>
          Répartition des {analysis.totalComments} commentaires avec une note inférieure à 4.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3">Répartition par Catégorie</h3>
          <ScrollArea className="h-64 pr-4">
            <div className="space-y-3">
              {analysis.commentsByCategory.map(({ category, count, percentage }) => (
                 <div key={category} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{category}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{count}</span>
                        <Badge variant="secondary" className="w-16 justify-center">{percentage.toFixed(1)}%</Badge>
                    </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div>
          <h3 className="font-semibold mb-3">Alertes "Attitude Livreur" ({analysis.attitudeComments.length})</h3>
           <ScrollArea className="h-64 pr-4">
            <div className="space-y-4">
              {analysis.attitudeComments.map((comment, index) => (
                <div key={index} className="text-sm p-3 bg-muted/50 rounded-lg border">
                  <p className="italic">"{comment.comment}"</p>
                  <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground mt-2">
                     <span className="flex items-center gap-1.5"><User className="h-3 w-3"/>{comment.driverName || 'N/A'}</span>
                     <span className="flex items-center gap-1.5"><Route className="h-3 w-3"/>{comment.roundName || 'N/A'}</span>
                     <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3"/>{comment.taskDate ? format(new Date(comment.taskDate), "dd/MM/yy") : 'N/A'}</span>
                  </div>
                </div>
              ))}
               {analysis.attitudeComments.length === 0 && (
                <p className="text-center text-muted-foreground pt-12">Aucun commentaire sur l'attitude du livreur pour cette période.</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

    