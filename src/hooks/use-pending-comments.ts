
"use client";

import { useMemo } from "react";
import { useCollection, useFirebase } from "@/firebase";
import { collection, where } from "firebase/firestore";
import { Tache } from "@/lib/types";
import { useFilters } from "@/context/filter-context";

type CategorizedComment = {
  taskId: string;
  status: "à traiter" | "traité";
};

/**
 * Custom hook to count the number of comments that are pending action.
 * It fetches tasks and categorized comments, then calculates how many new negative comments
 * from tasks have not yet been categorized.
 */
export function usePendingComments() {
  const { firestore } = useFirebase();
  const { dateRange } = useFilters();

  const categorizedCommentsCollection = useMemo(() => 
    collection(firestore, "categorized_comments"), 
    [firestore]
  );
  const tasksCollection = useMemo(() => 
    collection(firestore, "tasks"), 
    [firestore]
  );
  
  const firestoreFilters = useMemo(() => {
    const from = dateRange?.from;
    const to = dateRange?.to;
    if (!from || !to) return [];
    return [
      where("date", ">=", from),
      where("date", "<=", to)
    ];
  }, [dateRange]);

  const { data: categorizedComments, isLoading: isLoadingCategorized } = useCollection<CategorizedComment>(categorizedCommentsCollection, firestoreFilters);
  const { data: tasks, isLoading: isLoadingTasks } = useCollection<Tache>(tasksCollection, firestoreFilters);

  const count = useMemo(() => {
    // Return 0 if data is not yet loaded
    if (!tasks || !categorizedComments) return 0;

    // Create a Set of task IDs from already categorized comments for efficient lookup
    const categorizedIds = new Set(categorizedComments.map(c => c.taskId));

    // Filter tasks to find new, uncategorized negative comments
    const newCommentsCount = tasks.filter(task => 
      !categorizedIds.has(task.tacheId) &&
      typeof task.metaDonnees?.notationLivreur === 'number' &&
      task.metaDonnees.notationLivreur < 4 &&
      task.metaDonnees.commentaireLivreur
    ).length;
    
    // Filter already categorized comments that are still marked as "à traiter"
    const pendingCategorizedCount = categorizedComments.filter(c => c.status === 'à traiter').length;

    return newCommentsCount + pendingCategorizedCount;

  }, [categorizedComments, tasks]);

  return {
    count,
    isLoading: isLoadingCategorized || isLoadingTasks
  };
}

    