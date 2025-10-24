
"use client";

import { useMemo } from "react";
import { useFilters } from "@/context/filter-context";

/**
 * Custom hook to count the number of detractor verbatims that are pending action.
 */
export function usePendingVerbatims() {
  const { allProcessedVerbatims, isContextLoading } = useFilters();

  const pendingCount = useMemo(() => {
    if (isContextLoading || !allProcessedVerbatims) return 0;
    
    // The `allProcessedVerbatims` from the context now contains the correct, unified list.
    // We just need to count how many of them have the "à traiter" status.
    return allProcessedVerbatims.filter(v => v.status === 'à traiter').length;

  }, [allProcessedVerbatims, isContextLoading]);

  return {
    count: pendingCount,
    isLoading: isContextLoading
  };
}
