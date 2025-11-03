
import { useState, useEffect, useCallback } from 'react';
import type { ProcessedVerbatim } from "@/app/verbatim-treatment/page";

const CACHE_KEY = 'pendingProcessedVerbatims';

export function usePendingVerbatims() {
  const [pendingVerbatims, setPendingVerbatims] = useState<Record<string, ProcessedVerbatim>>({});

  // Load pending verbatims from localStorage on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(CACHE_KEY);
        if (saved) {
          setPendingVerbatims(JSON.parse(saved));
        }
      } catch (error) {
        console.error("Failed to load pending verbatims from cache:", error);
        window.localStorage.removeItem(CACHE_KEY);
      }
    }
  }, []);

  const updateCache = (newPendingVerbatims: Record<string, ProcessedVerbatim>) => {
    setPendingVerbatims(newPendingVerbatims);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(newPendingVerbatims));
    }
  };

  const addPendingVerbatim = useCallback((verbatim: ProcessedVerbatim) => {
    const newVerbatims = { ...pendingVerbatims, [verbatim.taskId]: verbatim };
    updateCache(newVerbatims);
  }, [pendingVerbatims]);

  const removePendingVerbatim = useCallback((taskId: string) => {
    const { [taskId]: _, ...rest } = pendingVerbatims;
    updateCache(rest);
  }, [pendingVerbatims]);
  
  const clearAllPendingVerbatims = useCallback(() => {
    updateCache({});
  }, []);

  const isPending = useCallback((taskId: string) => {
    return !!pendingVerbatims[taskId];
  }, [pendingVerbatims]);

  return {
    pendingVerbatims,
    addPendingVerbatim,
    removePendingVerbatim,
    clearAllPendingVerbatims,
    isPending,
    hasPendingItems: Object.keys(pendingVerbatims).length > 0,
  };
}
