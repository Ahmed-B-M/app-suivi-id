
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
  collectionRef: CollectionReference<DocumentData> | null,
  constraints: QueryConstraint[] = [],
  options: { realtime?: boolean, refreshKey?: number } = {}
): { data: T[]; loading: boolean; error: Error | null; lastUpdateTime: Date | null; setData: React.Dispatch<React.SetStateAction<T[]>> } {
  const { realtime = true, refreshKey = 0 } = options;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const cacheKey = useMemo(() => {
    if (!collectionRef) return null;
    const path = collectionRef.path;
    const constraintsString = constraints.map(c => (c as any)._type + JSON.stringify((c as any)._queryConstraints || (c as any)._field)).join('-');
    return `${path}-${constraintsString}-${refreshKey}`; // Include refreshKey in the cacheKey
  }, [collectionRef, constraints, refreshKey]);


  useEffect(() => {
    if (!collectionRef || !cacheKey) {
      setLoading(false);
      return;
    }

    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey)!;
        if (realtime) {
          cached.listeners++;
        }
        setData(cached.data as T[]);
        setLastUpdateTime(cached.lastUpdateTime);
        setLoading(false);
        if (!realtime) return;
    } else {
        setLoading(true);
    }
    
    if (!realtime) {
        // One-time fetch logic would go here if needed, but this hook is primarily for real-time
        setLoading(false);
        return;
    }
        
    const finalQuery = query(collectionRef, ...constraints);

    const unsubscribe = onSnapshot(finalQuery, (snapshot) => {
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
        
        const existingCached = cache.get(cacheKey);
        cache.set(cacheKey, { 
            data: newData, 
            lastUpdateTime: newUpdateTime, 
            unsubscribe, 
            listeners: existingCached ? existingCached.listeners + 1 : 1 
        });

      } catch (e: any) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, (err) => {
      setError(err);
      setLoading(false);
    });

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
  }, [cacheKey, realtime, collectionRef, ...constraints]); // Add constraints to dependency array

  return { data, loading, error, lastUpdateTime, setData };
}
