
"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { onSnapshot, query, where, Query, DocumentData, CollectionReference, QueryConstraint } from 'firebase/firestore';

// A simple in-memory cache
const cache = new Map<string, { data: any[]; lastUpdateTime: Date; unsubscribe: () => void; listeners: number }>();

/**
 * Clears the entire collection cache and unsubscribes from all listeners.
 */
export function clearCollectionCache() {
  console.log("Clearing collection cache...");
  for (const [key, cached] of cache.entries()) {
    console.log(`Unsubscribing from ${key}`);
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
    const constraintsString = constraints.map(c => c.constructor.name + JSON.stringify(c)).join('-');
    return `${path}-${constraintsString}-${refreshKey}`; // Include refreshKey in the cacheKey
  }, [collectionQuery, constraints, refreshKey]);


  useEffect(() => {
    if (!collectionQuery || !cacheKey) {
      setLoading(false);
      return;
    }

    // If a listener for this exact query already exists, just use its data.
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey)!;
        cached.listeners++;
        setData(cached.data as T[]);
        setLastUpdateTime(cached.lastUpdateTime);
        setLoading(false);
    } else {
        setLoading(true);
        
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
            
            // If another component set up the listener while we were fetching,
            // update the existing cache entry instead of creating a new one.
            if (cache.has(cacheKey)) {
              const existing = cache.get(cacheKey)!;
              existing.data = newData;
              existing.lastUpdateTime = newUpdateTime;
            } else {
              cache.set(cacheKey, { data: newData, lastUpdateTime: newUpdateTime, unsubscribe, listeners: 1 });
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

        // Store the new subscription, or update if it was created in parallel
        if (!cache.has(cacheKey)) {
            cache.set(cacheKey, { data: [], lastUpdateTime: new Date(), unsubscribe, listeners: 1 });
        }
    }

    return () => {
        if (cacheKey && cache.has(cacheKey)) {
           const cached = cache.get(cacheKey)!;
           cached.listeners--;
           if (cached.listeners === 0) {
               cached.unsubscribe();
               cache.delete(cacheKey);
           }
        }
    };
  }, [cacheKey]); 

  return { data, loading, error, lastUpdateTime };
}
