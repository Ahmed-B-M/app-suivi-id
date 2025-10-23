
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSingleCommentAction, categorizeSingleCommentAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useFilters } from "@/context/filter-context";
import { Loader2, Sparkles } from "lucide-react";
import type { CategorizedComment } from "@/hooks/use-pending-comments";


const categoryOptions = [
    { value: "Attitude livreur", label: "Attitude livreur" },
    { value: "Amabilité livreur", label: "Amabilité livreur" },
    { value: "Casse produit", label: "Casse produit" },
    { value: "Manquant produit", label: "Manquant produit" },
    { value: "Manquant multiple", label: "Manquant multiple" },
    { value: "Manquant bac", label: "Manquant bac" },
    { value: "Non livré", label: "Non livré" },
    { value: "Erreur de préparation", label: "Erreur de préparation" },
    { value: "Erreur de livraison", label: "Erreur de livraison" },
    { value: "Livraison en avance", label: "Livraison en avance" },
    { value: "Livraison en retard", label: "Livraison en retard" },
    { value: "Rupture chaine de froid", label: "Rupture chaine de froid" },
    { value: "Process", label: "Process" },
    { value: "Non pertinent", label: "Non pertinent" },
    { value: "Autre", label: "Autre" },
];


export default function CommentManagementPage() {
  const { allComments, isContextLoading } = useFilters();
  const [statusFilter, setStatusFilter] = useState<'tous' | 'à traiter' | 'traité'>('à traiter');
  
  const [editableComments, setEditableComments] = useState<
    CategorizedComment[]
  >([]);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const filteredComments = useMemo(() => {
    let commentsToFilter = allComments;
    
    if (statusFilter !== 'tous') {
      commentsToFilter = commentsToFilter.filter(comment => comment.status === statusFilter);
    }
    
    return commentsToFilter.sort((a, b) => {
        const dateA = a.taskDate ? new Date(a.taskDate as string).getTime() : 0;
        const dateB = b.taskDate ? new Date(b.taskDate as string).getTime() : 0;
        return dateB - dateA;
    });

  }, [allComments, statusFilter]);

  useEffect(() => {
    setEditableComments(filteredComments);
  }, [filteredComments]);

  const handleCategoryChange = (id: string, value: string) => {
    setEditableComments((prev) =>
      prev.map((comment) =>
        comment.id === id ? { ...comment, category: value } : comment
      )
    );
  };

  const handleSave = (comment: CategorizedComment) => {
    setSavingId(comment.id);
    startTransition(async () => {
      // Create a plain object for the server action
      const commentToSave = {
        taskId: comment.taskId,
        comment: comment.comment,
        rating: comment.rating,
        category: comment.category,
        taskDate: comment.taskDate ? new Date(comment.taskDate as string).toISOString() : undefined,
        driverName: comment.driverName,
      };

      const result = await updateSingleCommentAction(commentToSave);
      if (result.success) {
        toast({
          title: "Succès",
          description: "Le commentaire a été sauvegardé.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erreur de sauvegarde",
          description: result.error,
        });
      }
      setSavingId(null);
    });
  };
  
  const handleSuggestCategory = async (comment: CategorizedComment) => {
    setAnalyzingId(comment.id);
    try {
      const result = await categorizeSingleCommentAction(comment.comment);
      if (result.category) {
        handleCategoryChange(comment.id, result.category);
        toast({
          title: "Suggestion de l'IA",
          description: `Catégorie suggérée : "${result.category}".`,
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


  const isLoading = isContextLoading;
  
  if (isLoading) {
    return <div className="container mx-auto py-10 text-center">Chargement...</div>;
  }

  return (
    <div className="container mx-auto py-10">
       <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestion des Commentaires</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === 'à traiter' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('à traiter')}
          >
            À traiter
          </Button>
          <Button
            variant={statusFilter === 'traité' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('traité')}
          >
            Traités
          </Button>
          <Button
            variant={statusFilter === 'tous' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('tous')}
          >
            Tous
          </Button>
        </div>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Statut</TableHead>
              <TableHead>Task ID</TableHead>
              <TableHead className="w-[40%]">Commentaire</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Chauffeur</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editableComments.length > 0 ? (
              editableComments.map((comment) => (
                <TableRow key={comment.id}>
                  <TableCell>
                    <Badge
                      variant={
                        comment.status === "traité" ? "default" : "destructive"
                      }
                    >
                      {comment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{comment.taskId}</TableCell>
                  <TableCell>
                    <p className="whitespace-pre-wrap">{comment.comment}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={comment.rating < 4 ? "destructive" : "default"}>
                      {comment.rating} / 5
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Select
                        value={comment.category}
                        onValueChange={(value) =>
                          handleCategoryChange(comment.id, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                       <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSuggestCategory(comment)}
                          disabled={analyzingId === comment.id}
                          title="Suggérer une catégorie"
                      >
                          {analyzingId === comment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin"/>
                          ) : (
                              <Sparkles className="h-4 w-4 text-primary"/>
                          )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{comment.taskDate ? new Date(comment.taskDate as string).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>{comment.driverName}</TableCell>
                  <TableCell>
                    <Button onClick={() => handleSave(comment)} disabled={isPending && savingId === comment.id}>
                       {isPending && savingId === comment.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sauvegarder
                    </Button>
                  </TableCell>
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
