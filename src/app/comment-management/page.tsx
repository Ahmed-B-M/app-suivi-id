
"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveCategorizedCommentsAction, categorizeSingleCommentAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useFilters } from "@/context/filter-context";
import { Loader2, Sparkles, Save } from "lucide-react";
import { usePendingComments, type CategorizedComment } from "@/hooks/use-pending-comments";
import { categories as categoryOptions } from "@/components/app/comment-analysis";
import { InlineMultiSelect } from "@/components/ui/inline-multi-select"; // <-- NEW IMPORT

export default function CommentManagementPage() {
  const { allComments, isContextLoading } = useFilters();
  const [statusFilter, setStatusFilter] = useState<'tous' | 'à traiter' | 'traité'>('à traiter');
  
  const { toast } = useToast();
  const [isSaving, startSaveTransition] = useTransition();
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const {
    pendingComments,
    addPendingComment,
    clearAllPendingComments,
    isPending,
    hasPendingItems,
  } = usePendingComments();

  const finalCommentsToDisplay = useMemo(() => {
    const mergedComments = allComments.map(comment => {
      const baseComment = pendingComments[comment.taskId] || comment;
      const category = baseComment.category;
      const normalizedCategory = Array.isArray(category) ? category : (category ? [category] : []);
      
      return { ...baseComment, category: normalizedCategory };
    });

    const commentsToFilter = statusFilter === 'tous' 
      ? mergedComments 
      : mergedComments.filter(comment => comment.status === statusFilter);
    
    return commentsToFilter.sort((a, b) => {
        const dateA = a.taskDate ? new Date(a.taskDate as string).getTime() : 0;
        const dateB = b.taskDate ? new Date(b.taskDate as string).getTime() : 0;
        return dateB - dateA;
    });

  }, [allComments, pendingComments, statusFilter]);

  const handleCategoryChange = (comment: CategorizedComment, newCategories: string[]) => {
    const updatedComment = { ...comment, category: newCategories, status: 'traité' as const };
    addPendingComment(updatedComment);
  };

  const handleSaveAll = () => {
    startSaveTransition(async () => {
      const commentsToSave = Object.values(pendingComments);
      if (commentsToSave.length === 0) return;

      const result = await saveCategorizedCommentsAction(commentsToSave);
      if (result.success) {
        toast({
          title: "Succès",
          description: `${commentsToSave.length} commentaire(s) ont été sauvegardés.`,
        });
        clearAllPendingComments();
      } else {
        toast({
          variant: "destructive",
          title: "Erreur de sauvegarde",
          description: result.error,
        });
      }
    });
  };
  
  const handleSuggestCategory = async (comment: CategorizedComment) => {
    setAnalyzingId(comment.taskId);
    try {
      const result = await categorizeSingleCommentAction(comment.comment);
      if (result.categories) {
         handleCategoryChange(comment, result.categories);
        toast({
          title: "Suggestion de l'IA appliquée",
          description: `Catégories suggérées : "${result.categories.join(', ')}".`,
        });
      }
    } catch (error) {
      toast({
        title: "Erreur d'analyse",
        description: "Impossible d'obtenir une suggestion de l'IA.",
        variant: "destructive",
      });
    } finally {
      setAnalyzingId(null);
    }
  };

  if (isContextLoading) {
    return <div className="container mx-auto py-10 text-center">Chargement des données...</div>;
  }

  return (
    <div className="container mx-auto py-10">
       <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestion des Commentaires</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant={statusFilter === 'à traiter' ? 'default' : 'outline'} onClick={() => setStatusFilter('à traiter')}>À traiter</Button>
            <Button variant={statusFilter === 'traité' ? 'default' : 'outline'} onClick={() => setStatusFilter('traité')}>Traités</Button>
            <Button variant={statusFilter === 'tous' ? 'default' : 'outline'} onClick={() => setStatusFilter('tous')}>Tous</Button>
          </div>
          {hasPendingItems && (
            <Button onClick={handleSaveAll} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Tout Sauvegarder ({Object.keys(pendingComments).length})
            </Button>
          )}
        </div>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Statut</TableHead>
              <TableHead>Task ID</TableHead>
              <TableHead className="w-[30%]">Commentaire</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Chauffeur</TableHead>
              <TableHead>Entrepôt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {finalCommentsToDisplay.length > 0 ? (
              finalCommentsToDisplay.map((comment) => (
                <TableRow key={comment.taskId}>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant={comment.status === "traité" ? "default" : "destructive"}>
                        {comment.status}
                      </Badge>
                      {isPending(comment.taskId) && <Badge variant="secondary">Modifié</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{comment.taskId}</TableCell>
                  <TableCell><p className="whitespace-pre-wrap">{comment.comment}</p></TableCell>
                  <TableCell><Badge variant={comment.rating < 4 ? "destructive" : "default"}>{comment.rating} / 5</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {/* NEW COMPONENT IN USE */}
                      <InlineMultiSelect
                        options={categoryOptions}
                        selected={comment.category}
                        onChange={(value) => handleCategoryChange(comment, value)}
                      />
                       <Button size="icon" variant="ghost" onClick={() => handleSuggestCategory(comment)} disabled={analyzingId === comment.taskId} title="Suggérer une catégorie">
                          {analyzingId === comment.taskId ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4 text-primary"/>}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{comment.taskDate ? new Date(comment.taskDate as string).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>{comment.driverName}</TableCell>
                  <TableCell>{comment.nomHub}</TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                        Aucun commentaire à afficher pour ce filtre.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
