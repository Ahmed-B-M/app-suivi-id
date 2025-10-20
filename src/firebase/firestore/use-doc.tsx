
"use client";

import { useEffect, useState, useMemo } from 'react';
import { onSnapshot, doc, DocumentReference } from 'firebase/firestore';
import { useFirebase } from '../provider';

// A simple in-memory cache for documents
const cache = new Map<string, { data: any; lastUpdateTime: Date }>();

export function useDoc<T>(
  docRef: DocumentReference
): { data: T | null; loading: boolean; error: Error | null; lastUpdateTime: Date | null } {
  const { firestore } = useFirebase();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const cacheKey = useMemo(() => docRef.path, [docRef]);

  useEffect(() => {
    // Check cache first
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      setData(cached.data as T);
      setLastUpdateTime(cached.lastUpdateTime);
      setLoading(false);
      // Still set up the listener for real-time updates
    }

    const unsubscribe = onSnapshot(docRef, (doc) => {
      try {
        if (doc.exists()) {
          const newData = { ...doc.data(), id: doc.id } as T;
          const newUpdateTime = new Date();
          setData(newData);
          setLastUpdateTime(newUpdateTime);
          
          // Update cache
          cache.set(cacheKey, { data: newData, lastUpdateTime: newUpdateTime });
        } else {
          setData(null); // Document does not exist
        }
      } catch (e: any) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, (err) => {
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [docRef, cacheKey]); // Re-run effect if docRef changes

  return { data, loading, error, lastUpdateTime };
}
