
"use client";

import { useMemo } from 'react';
import type { Tache } from '@/lib/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, MessageSquare, Star } from "lucide-react";
import { getDriverFullName } from '@/lib/grouping';
import { format } from 'date-fns';
import { categories } from '@/ai/flows/categorize-comment';

export type CategorizedComment = {
  task: Tache;
  category: string;
};

interface CommentAnalysisProps {
  data: CategorizedComment[];
  onCategoryChange: (taskId: string, newCategory: string) => void;
}

export function CommentAnalysis({ data, onCategoryChange }: CommentAnalysisProps) {
  const commentsByCategory = useMemo(() => {
    return data.reduce((acc, item) => {
      const category = item.category || 'Autre';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, CategorizedComment[]>);
  }, [data]);

  const sortedCategories = useMemo(() => {
    return Object.keys(commentsByCategory).sort((a, b) => 
        commentsByCategory[b].length - commentsByCategory[a].length
    );
  }, [commentsByCategory]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit />
          Analyse des Commentaires par IA
        </CardTitle>
        <CardDescription>
          Voici les {data.length} commentaires négatifs classés par catégorie. Vous pouvez modifier la catégorie avant de sauvegarder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedCategories.length > 0 ? (
           <Accordion type="multiple" className="w-full space-y-4">
            {sortedCategories.map(category => (
                <AccordionItem value={category} key={category} className="border-b-0">
                    <Card>
                         <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                            <div className="w-full flex justify-between items-center">
                                <span>{category}</span>
                                <Badge variant="secondary">{commentsByCategory[category].length} commentaire(s)</Badge>
                            </div>
                         </AccordionTrigger>
                         <AccordionContent className="p-0 pt-0">
                            <div className="p-4 bg-muted/30">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-1/5">Livreur</TableHead>
                                            <TableHead className="w-[120px]">Date</TableHead>
                                            <TableHead className="text-center w-[80px]">Note</TableHead>
                                            <TableHead className="w-2/5">Commentaire</TableHead>
                                            <TableHead className="w-1/4">Catégorie</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {commentsByCategory[category].map(({ task, category: currentCategory }) => (
                                            <TableRow key={task.tacheId}>
                                                <TableCell>{getDriverFullName(task) || 'N/A'}</TableCell>
                                                <TableCell>{task.date ? format(new Date(task.date), "dd/MM/yy") : 'N/A'}</TableCell>
                                                <TableCell className="text-center">
                                                     <Badge variant="destructive" className="flex items-center justify-center gap-1">
                                                        {task.metaDonnees?.notationLivreur}
                                                        <Star className="h-3 w-3"/>
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="italic text-muted-foreground">
                                                     <div className="flex items-start gap-2">
                                                        <MessageSquare className="h-4 w-4 mt-1 shrink-0" />
                                                        <span>"{task.metaDonnees?.commentaireLivreur}"</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                  <Select
                                                    value={currentCategory}
                                                    onValueChange={(newCategory) => onCategoryChange(task.tacheId, newCategory)}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Choisir une catégorie" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      {categories.map(cat => (
                                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                      ))}
                                                    </SelectContent>
                                                  </Select>
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
        ) : (
            <div className="text-center text-muted-foreground py-8">
                Aucune analyse de commentaire disponible.
            </div>
        )}
      </CardContent>
    </Card>
  );
}

    