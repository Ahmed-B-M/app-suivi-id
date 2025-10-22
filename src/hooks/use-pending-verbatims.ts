"use client";

import { useMemo } from "react";
import { useCollection } from "@/firebase";
import { collection } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { useFilters } from "@/context/filter-context";
import { ProcessedNpsVerbatim, NpsVerbatim } from "@/lib/types";

/**
 * Custom hook to count the number of detractor verbatims that are pending action.
 */
export function usePendingVerbatims() {
  const { firestore } = useFirebase();
  const { allNpsData, isContextLoading } = useFilters();

  const processedVerbatimsCollection = useMemo(() => 
    firestore ? collection(firestore, "processed_nps_verbatims") : null,
    [firestore]
  );
  
  const { data: savedVerbatims = [], isLoading: isLoadingSaved } = useCollection<ProcessedNpsVerbatim>(processedVerbatimsCollection);

  const pendingCount = useMemo(() => {
    if (isContextLoading || isLoadingSaved) return 0;
    
    // Get all detractor verbatims from the current filter context
    const detractorVerbatims = allNpsData.flatMap(d => d.verbatims).filter(v => v.npsCategory === 'Detractor');
    
    // Create a set of taskIds for verbatims that are already saved/processed
    const savedVerbatimTaskIds = new Set(savedVerbatims.map(v => v.taskId));
    
    // Filter out verbatims that have already been saved
    const newDetractorVerbatims = detractorVerbatims.filter(v => !savedVerbatimTaskIds.has(v.taskId));

    return newDetractorVerbatims.length;

  }, [allNpsData, savedVerbatims, isContextLoading, isLoadingSaved]);

  return {
    count: pendingCount,
    isLoading: isContextLoading || isLoadingSaved
  };
}
