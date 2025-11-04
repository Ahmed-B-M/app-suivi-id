
import { useState, useEffect, useCallback } from 'react';
import type { CommentStatus } from '@/lib/types';

// This type should ideally be in a central types file, but is defined here for clarity.
export interface CategorizedComment {
  id?: string;
  taskId: string;
  comment: string;
  rating: number;
  category: string[];
  responsibilities: string[];
  status: CommentStatus;
  taskDate?: string;
  driverName?: string;
  nomHub?: string;
}

const CACHE_KEY = 'pendingCategorizedComments';

export function usePendingComments() {
  const [pendingComments, setPendingComments] = useState<Record<string, Partial<CategorizedComment>>>({});

  // Load pending comments from localStorage on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(CACHE_KEY);
        if (saved) {
          setPendingComments(JSON.parse(saved));
        }
      } catch (error) {
        console.error("Failed to load pending comments from cache:", error);
        window.localStorage.removeItem(CACHE_KEY);
      }
    }
  }, []);

  const updateCache = (newPendingComments: Record<string, Partial<CategorizedComment>>) => {
    setPendingComments(newPendingComments);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(newPendingComments));
    }
  };

  const addPendingComment = useCallback((comment: CategorizedComment) => {
    setPendingComments(prev => {
      const newComments: Record<string, Partial<CategorizedComment>> = {
        ...prev,
        [comment.taskId]: {
          ...(prev[comment.taskId] || {}), // Keep existing pending changes
          ...comment, // Apply new changes
        }
      };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(newComments));
      }
      return newComments;
    });
  }, []);

  const removePendingComment = useCallback((taskId: string) => {
    setPendingComments(prev => {
      const { [taskId]: _, ...rest } = prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(rest));
      }
      return rest;
    });
  }, []);

  const clearAllPendingComments = useCallback(() => {
    updateCache({});
  }, []);

  const isPending = useCallback((taskId: string) => {
    return !!pendingComments[taskId];
  }, [pendingComments]);

  return {
    pendingComments,
    addPendingComment,
    removePendingComment,
    clearAllPendingComments,
    isPending,
    hasPendingItems: Object.keys(pendingComments).length > 0,
  };
}
