
"use client";

import { useEffect, useState, useMemo } from 'react';
import { onSnapshot, query, where, Query, DocumentData, CollectionReference } from 'firebase/firestore';

// A simple in-memory cache
const cache = new Map<string, { data: any[]; lastUpdateTime: Date }>();

export function useCollection<T>(
  collectionRef: CollectionReference<DocumentData>,
  filters?: { field: string; operator: any; value: any }[]
): { data: T[]; loading: boolean; error: Error | null; lastUpdateTime: Date | null } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const cacheKey = useMemo(() => {
    const filtersString = filters ? JSON.stringify(filters) : '';
    return `${collectionRef.path}-${filtersString}`;
  }, [collectionRef, filters]);

  useEffect(() => {
    // Check cache first
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      setData(cached.data as T[]);
      setLastUpdateTime(cached.lastUpdateTime);
      setLoading(false);
      // Still set up the listener, but the user gets the cached data instantly
    }

    let q: Query = collectionRef;
    if (filters && filters.length > 0) {
      filters.forEach(filter => {
        q = query(q, where(filter.field, filter.operator, filter.value));
      });
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const newData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as T[];
        const newUpdateTime = new Date();

        setData(newData);
        setLastUpdateTime(newUpdateTime);
        
        // Update cache
        cache.set(cacheKey, { data: newData, lastUpdateTime: newUpdateTime });

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
  }, [collectionRef, cacheKey]); // Re-run effect if collectionRef or filters change

  return { data, loading, error, lastUpdateTime };
}
