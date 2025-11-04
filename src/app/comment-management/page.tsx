
"use client";

import { useState, useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveCategorizedCommentsAction, categorizeSingleCommentAction, saveSingleCategorizedCommentAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useFilters } from "@/context/filter-context";
import { Loader2, Sparkles, Save } from "lucide-react";
import { usePendingComments, type CategorizedComment } from "@/hooks/use-pending-comments";
import { categories as categoryOptions } from "@/components/app/comment-analysis";
import { InlineMultiSelect } from "@/components/ui/inline-multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CommentStatus } from "@/lib/types";

const statusOptions: CommentStatus[] = ['à traiter', 'en cours', 'traité'];

export default function CommentManagementPage() {
  const { allComments, isContextLoading } = useFilters();
  const [statusFilter, setStatusFilter] = useState<CommentStatus | 'tous'>('à traiter');
  
  const { toast } = useToast();
  const [isSaving, startSaveTransition] = useTransition();
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const {
    pendingComments,
    addPendingComment,
    removePendingComment,
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

  const handleFieldChange = (comment: CategorizedComment, field: keyof CategorizedComment, value: any) => {
    const updatedComment = { ...comment, [field]: value };
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
  
  const handleSaveOne = async (comment: CategorizedComment) => {
    startSaveTransition(async () => {
      const result = await saveSingleCategorizedCommentAction(comment);
      if (result.success) {
        toast({
          title: "Commentaire sauvegardé",
          description: `Le commentaire pour la tâche ${comment.taskId} a été mis à jour.`,
        });
        removePendingComment(comment.taskId);
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
         handleFieldChange(comment, 'category', result.categories);
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
            <Button variant={statusFilter === 'en cours' ? 'default' : 'outline'} onClick={() => setStatusFilter('en cours')}>En cours</Button>
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
              <TableHead className="w-[150px]">Statut</TableHead>
              <TableHead>Task ID</TableHead>
              <TableHead className="w-[30%]">Commentaire</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Chauffeur</TableHead>
              <TableHead>Entrepôt</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {finalCommentsToDisplay.length > 0 ? (
              finalCommentsToDisplay.map((comment) => (
                <TableRow key={comment.taskId}>
                  <TableCell>
                    <Select value={comment.status} onValueChange={(value) => handleFieldChange(comment, 'status', value as CommentStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{comment.taskId}</TableCell>
                  <TableCell><p className="whitespace-pre-wrap">{comment.comment}</p></TableCell>
                  <TableCell><Badge variant={comment.rating < 4 ? "destructive" : "default"}>{comment.rating} / 5</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <InlineMultiSelect
                        options={categoryOptions}
                        selected={comment.category}
                        onChange={(value) => handleFieldChange(comment, 'category', value)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>{comment.taskDate ? new Date(comment.taskDate as string).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>{comment.driverName}</TableCell>
                  <TableCell>{comment.nomHub}</TableCell>
                  <TableCell className="text-right">
                     <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleSuggestCategory(comment)} disabled={analyzingId === comment.taskId} title="Suggérer une catégorie">
                          {analyzingId === comment.taskId ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4 text-primary"/>}
                        </Button>
                        {isPending(comment.taskId) && (
                          <Button size="icon" variant="ghost" onClick={() => handleSaveOne(comment)} disabled={isSaving} title="Sauvegarder ce commentaire">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-green-600" />}
                          </Button>
                        )}
                     </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
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
