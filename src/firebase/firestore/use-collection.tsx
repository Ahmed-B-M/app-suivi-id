
"use client";

import { useEffect, useState, useMemo } from 'react';
import { onSnapshot, query, where, Query, DocumentData, CollectionReference, QueryConstraint } from 'firebase/firestore';

// A simple in-memory cache
const cache = new Map<string, { data: any[]; lastUpdateTime: Date; unsubscribe: () => void }>();

export function useCollection<T>(
  collectionQuery: Query<DocumentData> | CollectionReference<DocumentData> | null,
  constraints: QueryConstraint[] = []
): { data: T[]; loading: boolean; error: Error | null; lastUpdateTime: Date | null } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const cacheKey = useMemo(() => {
    if (!collectionQuery) return null;
    const path = (collectionQuery as any).path;
    const constraintsString = constraints.map(c => JSON.stringify(c)).join('-');
    return `${path}-${constraintsString}`;
  }, [collectionQuery, constraints]);


  useEffect(() => {
    if (!collectionQuery || !cacheKey) {
      setLoading(false);
      return;
    }
    
    // If a listener for this exact query already exists, don't create a new one.
    // This can happen on fast re-renders.
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey)!;
        setData(cached.data as T[]);
        setLastUpdateTime(cached.lastUpdateTime);
        setLoading(false);
    } else {
        setLoading(true);
    }

    const q = query(collectionQuery, ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const newData = snapshot.docs.map(doc => {
            const docData = doc.data();
            Object.keys(docData).forEach(key => {
                if (docData[key]?.toDate) {
                    docData[key] = docData[key].toDate().toISOString();
                }
            });
            return { ...docData, id: doc.id };
        }) as T[];
        
        const newUpdateTime = new Date();

        setData(newData);
        setLastUpdateTime(newUpdateTime);
        setLoading(false);
        
        // Update cache with new data and the unsubscribe function
        cache.set(cacheKey, { data: newData, lastUpdateTime: newUpdateTime, unsubscribe });

      } catch (e: any) {
        setError(e);
        setLoading(false);
      }
    }, (err) => {
      setError(err);
      setLoading(false);
    });

    // Cleanup: when the component unmounts OR the query changes,
    // remove the listener from the cache and call it.
    return () => {
        if (cache.has(cacheKey)) {
           cache.get(cacheKey)?.unsubscribe();
           cache.delete(cacheKey);
        } else {
            // This might happen if the component unmounts before the first snapshot
            unsubscribe();
        }
    };
  }, [cacheKey]); // Only re-run the effect if the cacheKey changes.

  return { data, loading, error, lastUpdateTime };
}

    