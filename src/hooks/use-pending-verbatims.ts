
"use client";

import { useMemo } from "react";
import { useFilters } from "@/context/filter-context";
import { useCollection, useFirebase } from "@/firebase";
import { collection, where } from "firebase/firestore";
import { format } from "date-fns";
import type { ActionNoteDepot } from "@/lib/types";

/**
 * Custom hook to count the number of depots that have pending actions for the day.
 */
export function usePendingVerbatims() {
  const { allProcessedVerbatims, isContextLoading } = useFilters();
  const { firestore } = useFirebase();
  const todayString = format(new Date(), 'yyyy-MM-dd');

  // Fetch today's saved notes
  const notesCollection = useMemo(() => {
      return firestore ? collection(firestore, 'action_notes_depot') : null;
  }, [firestore]);
  const { data: savedNotes, loading: notesLoading } = useCollection<ActionNoteDepot>(notesCollection, [where('date', '==', todayString)]);

  const pendingCount = useMemo(() => {
    if (isContextLoading || notesLoading) return 0;

    // Get all depots that have verbatims to be processed today
    const depotsWithPendingVerbatims = new Set(
        allProcessedVerbatims
            .filter(v => v.status === 'à traiter')
            .map(v => v.depot)
            .filter(Boolean) as string[]
    );
    
    if (depotsWithPendingVerbatims.size === 0) return 0;
    
    // Get all depots for which a note has already been saved today
    const depotsWithSavedNotes = new Set(savedNotes.map(n => n.depot));
    
    // Count how many depots with pending verbatims do NOT have a saved note
    let count = 0;
    for (const depot of depotsWithPendingVerbatims) {
        if (!depotsWithSavedNotes.has(depot)) {
            count++;
        }
    }
    
    return count;

  }, [allProcessedVerbatims, savedNotes, isContextLoading, notesLoading]);

  return {
    count: pendingCount,
    isLoading: isContextLoading || notesLoading
  };
}
