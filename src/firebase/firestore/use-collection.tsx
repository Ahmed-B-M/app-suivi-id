
"use client";

import { useEffect, useState, useMemo } from 'react';
import { onSnapshot, query, where, Query, DocumentData, CollectionReference, QueryConstraint } from 'firebase/firestore';

// A simple in-memory cache
const cache = new Map<string, { data: any[]; lastUpdateTime: Date }>();

export function useCollection<T>(
  collectionRef: CollectionReference<DocumentData> | null,
  constraints: QueryConstraint[] = []
): { data: T[]; loading: boolean; error: Error | null; lastUpdateTime: Date | null } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const cacheKey = useMemo(() => {
    if (!collectionRef) return null;
    // Create a stable key from constraints
    const constraintsString = constraints.map(c => c.type + JSON.stringify(c)).join('-');
    return `${collectionRef.path}-${constraintsString}`;
  }, [collectionRef, constraints]);

  useEffect(() => {
    if (!collectionRef || !cacheKey) {
      setLoading(false);
      return;
    }

    // Check cache first
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      setData(cached.data as T[]);
      setLastUpdateTime(cached.lastUpdateTime);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const q = query(collectionRef, ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const newData = snapshot.docs.map(doc => {
            const docData = doc.data();
            // Convert Firestore Timestamps to JS Dates
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
