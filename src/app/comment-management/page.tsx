
"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useCollection, useFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
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
import { updateSingleCommentAction, fixAuthAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useFilters } from "@/context/filter-context";
import { Tache } from "@/lib/types";
import { getDriverFullName } from "@/lib/grouping";
import { Loader2 } from "lucide-react";

type CategorizedComment = {
  id: string;
  taskId: string;
  comment: string;
  rating: number;
  category: string;
  taskDate?: string;
  driverName?: string;
  status: "à traiter" | "traité";
};

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
  const { firestore } = useFirebase();
  const { allTasks: tasks, isContextLoading: isLoadingTasks } = useFilters();
  const [statusFilter, setStatusFilter] = useState<'tous' | 'à traiter' | 'traité'>('tous');
  
  const categorizedCommentsCollection = useMemo(() => collection(firestore, "categorized_comments"), [firestore]);

  const { data: categorizedComments, isLoading: isLoadingCategorized, error: categorizedError } = useCollection<CategorizedComment>(categorizedCommentsCollection);
  
  const [editableComments, setEditableComments] = useState<
    CategorizedComment[]
  >([]);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);

  const combinedComments = useMemo(() => {
    if (!tasks || !categorizedComments) return [];

    const categorizedIds = new Set(categorizedComments.map(c => c.taskId));

    const newCommentsFromTasks: CategorizedComment[] = tasks
      .filter(task => 
        !categorizedIds.has(task.tacheId) &&
        typeof task.metaDonnees?.notationLivreur === 'number' &&
        task.metaDonnees.notationLivreur < 4 &&
        task.metaDonnees.commentaireLivreur
      )
      .map(task => ({
        id: task.tacheId,
        taskId: task.tacheId,
        comment: task.metaDonnees!.commentaireLivreur!,
        rating: task.metaDonnees!.notationLivreur!,
        category: 'Autre',
        taskDate: task.date,
        driverName: getDriverFullName(task),
        status: 'à traiter',
      }));

      return [...categorizedComments, ...newCommentsFromTasks];

  }, [categorizedComments, tasks]);

  const filteredComments = useMemo(() => {
    let commentsToFilter = combinedComments;
    
    if (statusFilter !== 'tous') {
      commentsToFilter = commentsToFilter.filter(comment => comment.status === statusFilter);
    }
    
    return commentsToFilter.sort((a, b) => {
        const dateA = a.taskDate ? new Date(a.taskDate).getTime() : 0;
        const dateB = b.taskDate ? new Date(b.taskDate).getTime() : 0;
        return dateB - dateA;
    });

  }, [combinedComments, statusFilter]);

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
      // @ts-ignore
      await fixAuthAction();
      setSavingId(null);
    });
  };

  const isLoading = isLoadingCategorized || isLoadingTasks;
  const error = categorizedError;

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (error) {
    return <div>Erreur: {error.message}</div>;
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
          {editableComments.map((comment) => (
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
              </TableCell>
              <TableCell>{comment.taskDate ? new Date(comment.taskDate).toLocaleDateString() : 'N/A'}</TableCell>
              <TableCell>{comment.driverName}</TableCell>
              <TableCell>
                <Button onClick={() => handleSave(comment)} disabled={isPending && savingId === comment.id}>
                   {isPending && savingId === comment.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sauvegarder
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
