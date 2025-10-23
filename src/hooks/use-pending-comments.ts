
"use client";

import { useMemo } from "react";
import { useFilters } from "@/context/filter-context";

export type CategorizedComment = {
  id: string;
  taskId: string;
  comment: string;
  rating: number;
  category: string[];
  taskDate?: string | Date;
  driverName?: string;
  status: "à traiter" | "traité";
};

/**
 * Custom hook to count the number of comments that are pending action.
 * It now relies on the unified `allComments` list from the `FilterContext`.
 */
export function usePendingComments() {
  const { allComments, isContextLoading } = useFilters();

  const pendingCount = useMemo(() => {
    if (isContextLoading || !allComments) return 0;
    
    // Simply count the items with the "à traiter" status from the filtered list.
    return allComments.filter(comment => comment.status === 'à traiter').length;

  }, [allComments, isContextLoading]);


  return {
    count: pendingCount,
    isLoading: isContextLoading
  };
}

    
