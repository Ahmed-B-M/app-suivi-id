
"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
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
import { Loader2, Sparkles, Save, User, Building, Calendar, Bot, Link as LinkIcon } from "lucide-react";
import { usePendingComments, type CategorizedComment } from "@/hooks/use-pending-comments";
import { categories as categoryOptions } from "@/components/app/comment-analysis";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CommentStatus } from "@/lib/types";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { format } from "date-fns";
import Link from "next/link";
import { useFirebase, useQuery, useMemoFirebase } from "@/firebase";
import { collection, where, orderBy, query, QueryConstraint } from "firebase/firestore";

const statusOptions: CommentStatus[] = ['à traiter', 'en cours', 'traité'];
const responsibilityOptions = ["STEF", "ID", "Carrefour", "Inconnu"];

export default function CommentManagementPage() {
  const { isContextLoading: isFiltersLoading } = useFilters();
  const { firestore } = useFirebase();
  const [statusFilter, setStatusFilter] = useState<CommentStatus | 'tous'>('à traiter');
  
  const { toast } = useToast();
  const [isSaving, startSaveTransition] = useTransition();
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [isBulkAnalyzing, startBulkAnalyzeTransition] = useTransition();

  // --- Data Fetching Logic ---
  const commentsCollection = useMemoFirebase(() => 
    firestore ? collection(firestore, 'categorized_comments') : null
  , [firestore]);

  const commentsConstraints = useMemo(() => {
    const constraints: QueryConstraint[] = [orderBy("taskDate", "desc")];
    if (statusFilter !== 'tous') {
        constraints.unshift(where("status", "==", statusFilter));
    }
    return constraints;
  }, [statusFilter]);
  
  const { data: allComments, loading: isCommentsLoading } = useQuery<CategorizedComment>(commentsCollection, commentsConstraints, {realtime: true});
  // --- End Data Fetching ---

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
      const responsibilities = baseComment.responsibilities;

      return { 
        ...baseComment, 
        category: Array.isArray(category) ? category : (category ? [category] : []),
        responsibilities: Array.isArray(responsibilities) ? responsibilities : (responsibilities ? [responsibilities] : []),
      };
    });
    
    return mergedComments.sort((a, b) => {
        const dateA = a.taskDate ? new Date(a.taskDate as string).getTime() : 0;
        const dateB = b.taskDate ? new Date(b.taskDate as string).getTime() : 0;
        return dateB - dateA;
    });

  }, [allComments, pendingComments]);

  const handleFieldChange = (comment: CategorizedComment, field: keyof CategorizedComment, value: any) => {
    const updatedComment = { ...comment, [field]: value, status: 'en cours' as const };
    addPendingComment(updatedComment);
  };
  
  const prepareForSave = (comment: CategorizedComment): CategorizedComment => {
    const hasCategory = comment.category && comment.category.length > 0 && comment.category[0] !== '';
    const hasResponsibility = comment.responsibilities && comment.responsibilities.length > 0 && comment.responsibilities[0] !== '';

    if (hasCategory && hasResponsibility) {
        return { ...comment, status: 'traité' };
    }
    return comment;
  };

  const handleSaveAll = () => {
    startSaveTransition(async () => {
      const commentsToSaveRaw = Object.values(pendingComments);
      if (commentsToSaveRaw.length === 0) return;
      
      const commentsToSave = commentsToSaveRaw.map(prepareForSave);

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
      const commentToSave = prepareForSave(comment);
      const result = await saveSingleCategorizedCommentAction(commentToSave);
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
  
  const handleSuggest = async (comment: CategorizedComment) => {
    setAnalyzingId(comment.taskId);
    try {
      const result = await categorizeSingleCommentAction(comment.comment);
      const updates: Partial<CategorizedComment> = { status: 'en cours' };
      if (result.categories) {
         updates.category = result.categories;
      }
      if (result.responsibilities) {
        updates.responsibilities = result.responsibilities;
      }
      
      const updatedComment = { ...comment, ...updates };
      addPendingComment(updatedComment);

      toast({
        title: "Suggestion de l'IA appliquée",
        description: `Suggestions mises en cache. N'oubliez pas de sauvegarder.`,
      });
      
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

  const handleBulkSuggest = useCallback(() => {
    startBulkAnalyzeTransition(async () => {
      const commentsToAnalyze = finalCommentsToDisplay.filter(
        (c) => c.status === "à traiter"
      );
      if (commentsToAnalyze.length === 0) {
        toast({
          title: "Aucun commentaire à analyser",
          description: "Il n'y a pas de commentaires avec le statut 'à traiter'.",
        });
        return;
      }

      toast({
        title: "Analyse en cours...",
        description: `Lancement de l'analyse pour ${commentsToAnalyze.length} commentaires.`,
      });

      const analysisPromises = commentsToAnalyze.map((comment) =>
        categorizeSingleCommentAction(comment.comment)
          .then((result) => ({
            success: true,
            comment,
            result,
          }))
          .catch((error) => {
            console.error(`Échec de l'analyse pour la tâche ${comment.taskId}:`, error);
            return { success: false, comment, error };
          })
      );

      const results = await Promise.all(analysisPromises);
      
      const newPendingComments: Record<string, CategorizedComment> = {};
      let successCount = 0;

      results.forEach(res => {
        if (res.success) {
          const { comment, result } = res;
          const updates: Partial<CategorizedComment> = { status: "en cours" };
          if (result.categories) updates.category = result.categories;
          if (result.responsibilities) updates.responsibilities = result.responsibilities;
          
          newPendingComments[comment.taskId] = { ...comment, ...updates };
          successCount++;
        }
      });
      
      if(Object.keys(newPendingComments).length > 0) {
        addPendingComment(newPendingComments);
      }

      toast({
        title: "Analyse terminée",
        description: `${successCount} sur ${commentsToAnalyze.length} commentaires ont été analysés et mis en cache.`,
      });
    });
  }, [finalCommentsToDisplay, toast, startBulkAnalyzeTransition, addPendingComment]);

  const isLoading = isFiltersLoading || isCommentsLoading;

  if (isLoading) {
    return <div className="container mx-auto py-10 text-center">Chargement des données...</div>;
  }

  return (
    <div className="container mx-auto py-10">
       <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestion des Commentaires</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant={statusFilter === 'à traiter' ? 'destructive' : 'outline'} onClick={() => setStatusFilter('à traiter')}>À traiter</Button>
            <Button variant={statusFilter === 'en cours' ? 'default' : 'outline'} onClick={() => setStatusFilter('en cours')}>En cours</Button>
            <Button variant={statusFilter === 'traité' ? 'default' : 'outline'} onClick={() => setStatusFilter('traité')}>Traités</Button>
            <Button variant={statusFilter === 'tous' ? 'default' : 'outline'} onClick={() => setStatusFilter('tous')}>Tous</Button>
          </div>
          {statusFilter === 'à traiter' && (
            <Button onClick={handleBulkSuggest} disabled={isBulkAnalyzing}>
              {isBulkAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Bot className="mr-2 h-4 w-4" />}
              Analyser les commentaires à traiter
            </Button>
          )}
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
              <TableHead>Détails</TableHead>
              <TableHead className="w-[30%]">Commentaire</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="w-[15%]">Responsabilité</TableHead>
              <TableHead className="w-[20%]">Catégorie</TableHead>
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
                  <TableCell>
                    <div className="flex flex-col gap-1.5 text-xs">
                        <Link href={`/task/${comment.taskId}`} className="flex items-center gap-1.5 font-mono text-primary hover:underline">
                            <LinkIcon className="h-3 w-3"/>
                            {comment.taskId}
                        </Link>
                        <div className="flex items-center gap-1.5 font-medium text-foreground"><User className="h-3 w-3 text-muted-foreground"/>{comment.driverName || 'N/A'}</div>
                        <div className="flex items-center gap-1.5 text-muted-foreground"><Building className="h-3 w-3"/>{comment.nomHub || 'N/A'}</div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3 w-3"/>
                            {comment.taskDate ? format(new Date(comment.taskDate as string), 'dd/MM/yyyy') : 'N/A'}
                        </div>
                    </div>
                  </TableCell>
                  <TableCell><p className="whitespace-pre-wrap italic text-muted-foreground">"{comment.comment}"</p></TableCell>
                  <TableCell><Badge variant={comment.rating < 4 ? "destructive" : "default"}>{comment.rating} / 5</Badge></TableCell>
                  <TableCell>
                    <MultiSelectCombobox
                        options={responsibilityOptions}
                        selected={comment.responsibilities || []}
                        onChange={(value) => handleFieldChange(comment, 'responsibilities', value)}
                        placeholder="Choisir..."
                        className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <MultiSelectCombobox
                        options={categoryOptions}
                        selected={comment.category}
                        onChange={(value) => handleFieldChange(comment, 'category', value)}
                        placeholder="Choisir..."
                        className="w-full"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                     <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleSuggest(comment)} disabled={analyzingId === comment.taskId} title="Suggérer catégories & responsabilités">
                          {analyzingId === comment.taskId ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4 text-primary"/>}
                        </Button>
                        {isPending(comment.taskId) && (
                          <Button size="icon" variant="ghost" onClick={() => handleSaveOne(comment)} disabled={isSaving} title="Sauvegarder ce commentaire">
                            {isSaving && analyzingId !== comment.taskId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-green-600" />}
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
