
"use client";

import { useMemo } from "react";
import { useCollection, useFirebase } from "@/firebase";
import { collection, where } from "firebase/firestore";
import { Tache } from "@/lib/types";
import { useFilters } from "@/context/filter-context";

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

  const pendingCount = useMemo(() => {
    if (!allTasks || !savedComments) return 0;
    
    const savedCommentIds = new Set(savedComments.map(c => c.taskId));
    
    const newNegativeComments = allTasks.filter(task => 
      !savedCommentIds.has(task.tacheId) &&
      typeof task.metaDonnees?.notationLivreur === 'number' &&
      task.metaDonnees.notationLivreur < 4 &&
      task.metaDonnees.commentaireLivreur
    );

    return newNegativeComments.length;

  }, [allTasks, savedComments]);


  return {
    count: pendingCount,
    isLoading: isLoadingCategorized || isLoadingTasks
  };
}
