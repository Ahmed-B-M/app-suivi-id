
"use client";

import { useEffect, useState, useMemo } from 'react';
import { onSnapshot, query, where, Query, DocumentData, CollectionReference, QueryConstraint } from 'firebase/firestore';

// A simple in-memory cache
const cache = new Map<string, { data: any[]; lastUpdateTime: Date; unsubscribe: () => void }>();

/**
 * Clears the entire collection cache and unsubscribes from all listeners.
 */
export function clearCollectionCache() {
  for (const cached of cache.values()) {
    cached.unsubscribe();
  }
  cache.clear();
}


export function useCollection<T>(
  collectionQuery: Query<DocumentData> | CollectionReference<DocumentData> | null,
  constraints: QueryConstraint[] = [],
  refreshKey: number = 0
): { data: T[]; loading: boolean; error: Error | null; lastUpdateTime: Date | null } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const cacheKey = useMemo(() => {
    if (!collectionQuery) return null;
    const path = (collectionQuery as any).path;
    const constraintsString = constraints.map(c => JSON.stringify(c)).join('-');
    return `${path}-${constraintsString}-${refreshKey}`; // Include refreshKey in the cacheKey
  }, [collectionQuery, constraints, refreshKey]);


  useEffect(() => {
    if (!collectionQuery || !cacheKey) {
      setLoading(false);
      return;
    }
    
    // If a listener for this exact query already exists, don't create a new one.
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey)!;
        setData(cached.data as T[]);
        setLastUpdateTime(cached.lastUpdateTime);
        setLoading(false);
        // Do not return here, we need to ensure the listener is active
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
        // Make sure to remove the old listener if one exists for the previous cache key
        const oldKey = `${(collectionQuery as any).path}-${constraints.map(c => JSON.stringify(c)).join('-')}-${refreshKey - 1}`;
        if (cache.has(oldKey)) {
            cache.get(oldKey)?.unsubscribe();
            cache.delete(oldKey);
        }

        // Store the new subscription
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
  }, [cacheKey]); // Re-run the effect if the cacheKey changes.

  return { data, loading, error, lastUpdateTime };
}
