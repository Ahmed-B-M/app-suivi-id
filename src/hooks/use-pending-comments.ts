
"use client";

import { useMemo } from "react";
import { useCollection, useFirebase } from "@/firebase";
import { collection, where } from "firebase/firestore";
import { Tache } from "@/lib/types";
import { useFilters } from "@/context/filter-context";
import { getDriverFullName } from "@/lib/grouping";
import { getCategoryFromKeywords } from "@/lib/stats-calculator";

export type CategorizedComment = {
  id: string;
  taskId: string;
  comment: string;
  rating: number;
  category: string;
  taskDate?: string | Date;
  driverName?: string;
  status: "à traiter" | "traité";
};

/**
 * Custom hook to count the number of comments that are pending action.
 * It fetches tasks and categorized comments, then calculates how many new negative comments
 * from tasks have not yet been categorized.
 */
export function usePendingComments() {
  const { firestore } = useFirebase();
  const { allTasks, isContextLoading: isLoadingTasks } = useFilters();

  const categorizedCommentsCollection = useMemo(() => 
    collection(firestore, "categorized_comments"), 
    [firestore]
  );
  
  const { data: savedComments, isLoading: isLoadingCategorized } = useCollection<CategorizedComment>(categorizedCommentsCollection);

  const allComments = useMemo(() => {
    if (!allTasks || !savedComments) return [];
    
    const savedCommentsMap = new Map(savedComments.map(c => [c.taskId, c]));
    
    return allTasks
      .filter(task => 
        typeof task.metaDonnees?.notationLivreur === 'number' &&
        task.metaDonnees.commentaireLivreur
      )
      .map(task => {
        const savedComment = savedCommentsMap.get(task.tacheId);
        if (savedComment) {
            return {
                ...savedComment,
                id: savedComment.id || task.tacheId
            };
        } else {
            return {
                id: task.tacheId,
                taskId: task.tacheId,
                comment: task.metaDonnees!.commentaireLivreur!,
                rating: task.metaDonnees!.notationLivreur!,
                category: getCategoryFromKeywords(task.metaDonnees!.commentaireLivreur!),
                taskDate: task.date,
                driverName: getDriverFullName(task),
                status: 'à traiter' as const,
            };
        }
    });
  }, [allTasks, savedComments]);


  const pendingCount = useMemo(() => {
     if (!allComments) return 0;
     return allComments.filter(c => c.status === 'à traiter').length;
  }, [allComments]);


  return {
    count: pendingCount,
    allComments,
    isLoading: isLoadingCategorized || isLoadingTasks
  };
}

    