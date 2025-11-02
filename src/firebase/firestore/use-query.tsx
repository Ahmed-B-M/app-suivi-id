
"use client";

import { useEffect, useState, useMemo } from 'react';
import {
  onSnapshot,
  getDocs,
  query,
  Query,
  DocumentData,
  CollectionReference,
  QueryConstraint,
  QuerySnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

// A more sophisticated in-memory cache
interface CacheEntry {
  data: any[];
  lastUpdateTime: Date;
  unsubscribe?: () => void; // Only for realtime listeners
  listeners?: number; // Only for realtime listeners
  promise?: Promise<any>; // For one-time fetches
}
const cache = new Map<string, CacheEntry>();

/**
 * Clears the entire query cache and unsubscribes from all listeners.
 */
export function clearQueryCache() {
  for (const cached of cache.values()) {
    if (cached.unsubscribe) {
      cached.unsubscribe();
    }
  }
  cache.clear();
}

export interface UseQueryOptions {
  realtime?: boolean; // Set to true for real-time updates
  refreshKey?: number; // Increment to force a refresh
}

export function useQuery<T>(
  collectionQuery: Query<DocumentData> | CollectionReference<DocumentData> | null,
  constraints: QueryConstraint[] = [],
  options: UseQueryOptions = {}
): { data: T[]; loading: boolean; error: Error | null; lastUpdateTime: Date | null } {
  const { realtime = false, refreshKey = 0 } = options;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const cacheKey = useMemo(() => {
    if (!collectionQuery) return null;
    const path = (collectionQuery as any).path;
    const constraintsString = constraints.map(c => c.constructor.name + JSON.stringify(c)).join('-');
    return `${path}-${constraintsString}-${realtime}-${refreshKey}`;
  }, [collectionQuery, constraints, realtime, refreshKey]);

  useEffect(() => {
    if (!collectionQuery || !cacheKey) {
      setLoading(false);
      return;
    }

    const cached = cache.get(cacheKey);

    // If we have a cached value, use it immediately
    if (cached) {
      setData(cached.data as T[]);
      setLastUpdateTime(cached.lastUpdateTime);
      setLoading(false);
      
      if (realtime) {
        cached.listeners!++;
      } else {
        // For non-realtime, we don't need to do anything else.
        // The data is already fetched and cached.
        return;
      }
    } else {
      setLoading(true);
    }
    
    const q = query(collectionQuery, ...constraints);

    if (realtime) {
      const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const newData = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
          const docData = doc.data();
          // Convert Timestamps to ISO strings
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
        cache.set(cacheKey, { data: newData, lastUpdateTime: newUpdateTime, unsubscribe, listeners: 1 });
        setLoading(false);
      }, (err: Error) => {
        setError(err);
        setLoading(false);
      });

    } else {
      // One-time fetch
      const promise = getDocs(q).then((snapshot: QuerySnapshot<DocumentData>) => {
        const newData = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
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
        cache.set(cacheKey, { data: newData, lastUpdateTime: newUpdateTime });
        setLoading(false);
      }).catch((err: Error) => {
        setError(err);
        setLoading(false);
      });
      cache.set(cacheKey, { data: [], lastUpdateTime: new Date(), promise });
    }

    return () => {
      if (realtime && cache.has(cacheKey)) {
        const cached = cache.get(cacheKey)!;
        cached.listeners!--;
        if (cached.listeners === 0) {
          cached.unsubscribe!();
          cache.delete(cacheKey);
        }
      }
    };
  }, [cacheKey]);

  return { data, loading, error, lastUpdateTime };
}
