
"use client";

import { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback } from 'react';
import type { DateRange } from 'react-day-picker';
import { getHubCategory, getDepotFromHub, DEPOT_RULES } from '@/lib/grouping';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { Tache, Tournee } from '@/lib/types';
import { format } from 'date-fns';

type FilterType = 'tous' | 'depot' | 'magasin';

interface FilterContextProps {
  filterType: FilterType;
  setFilterType: (type: FilterType) => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  
  availableDepots: string[];
  selectedDepot: string;
  setSelectedDepot: (depot: string) => void;

  availableStores: string[];
  selectedStore: string;
  setSelectedStore: (store: string) => void;

  lastUpdateTime: Date | null;
  
  tasks: Tache[] | null;
  rounds: Tournee[] | null;
  isLoading: boolean;

  filteredTasks: Tache[];
  filteredRounds: Tournee[];
}

const FilterContext = createContext<FilterContextProps | undefined>(undefined);


// A new, more performant hook to fetch data with server-side date filtering
function useCollectionWithDateRange<T>(collectionName: string): { data: T[] | null, isLoading: boolean, error: Error | null } {
  const { firestore } = useFirebase();
  const { dateRange } = useFilterContext(); // We need this to apply date filters

  const memoizedQuery = useMemoFirebase(() => {
    if (!firestore || !dateRange?.from) {
      return null;
    }
    
    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
    toDate.setHours(23, 59, 59, 999);

    const fromISO = fromDate.toISOString();
    const toISO = toDate.toISOString();

    const collRef = collection(firestore, collectionName);
    return query(collRef, where("date", ">=", fromISO), where("date", "<=", toISO));

  }, [firestore, dateRange]);

  const { data, isLoading, error } = useCollection<T>(memoizedQuery);
  
  // @ts-ignore
  return { data, isLoading, error };
}


export function FilterProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const [filterType, setFilterType] = useState<FilterType>('tous');
  const [dateRange, _setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedDepot, setSelectedDepot] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');

  useEffect(() => {
    const today = new Date();
    _setDateRange({ from: today, to: today });
  }, []);

  const setDateRange = useCallback((range: DateRange | undefined) => {
    if (range?.from && !range.to) {
      _setDateRange({ from: range.from, to: range.from });
    } else {
      _setDateRange(range);
    }
  }, []);

  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || !dateRange?.from) return null;
    const from = new Date(dateRange.from);
    from.setHours(0, 0, 0, 0);
    const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
    to.setHours(23, 59, 59, 999);
    return query(collection(firestore, "tasks"), where("date", ">=", from.toISOString()), where("date", "<=", to.toISOString()));
  }, [firestore, dateRange]);

  const roundsQuery = useMemoFirebase(() => {
    if (!firestore || !dateRange?.from) return null;
    const from = new Date(dateRange.from);
    from.setHours(0, 0, 0, 0);
    const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
    to.setHours(23, 59, 59, 999);
    return query(collection(firestore, "rounds"), where("date", ">=", from.toISOString()), where("date", "<=", to.toISOString()));
  }, [firestore, dateRange]);
  
  const { data: tasks, isLoading: isLoadingTasks, error: tasksError } = useCollection<Tache>(tasksQuery);
  const { data: rounds, isLoading: isLoadingRounds, error: roundsError } = useCollection<Tournee>(roundsQuery);

  const { availableDepots, availableStores, lastUpdateTime } = useMemo(() => {
    const allItems: (Tache | Tournee)[] = [...(tasks || []), ...(rounds || [])];
    const storeSet = new Set<string>();
    let maxDate: Date | null = null;
    
    allItems.forEach(item => {
      const hub = item.nomHub;
      if (hub && getHubCategory(hub) === 'magasin') {
        storeSet.add(hub);
      }
      
      const updateDateStr = item.dateMiseAJour || item.updated;
      if (updateDateStr) {
        try {
          const updateDate = new Date(updateDateStr);
          if (!maxDate || updateDate > maxDate) {
            maxDate = updateDate;
          }
        } catch (e) {
          // ignore invalid date
        }
      }
    });

    return {
      availableDepots: DEPOT_RULES.map(r => r.name).sort(),
      availableStores: Array.from(storeSet).sort(),
      lastUpdateTime: maxDate,
    };
  }, [tasks, rounds]);

  const { filteredTasks, filteredRounds } = useMemo(() => {
    let currentTasks = tasks || [];
    let currentRounds = rounds || [];

    if (filterType !== 'tous') {
        const filterLogic = (item: Tache | Tournee) => getHubCategory(item.nomHub) === filterType;
        currentTasks = currentTasks.filter(filterLogic);
        currentRounds = currentRounds.filter(filterLogic);
    }

    if (selectedDepot !== "all") {
      const filterLogic = (item: Tache | Tournee) => getDepotFromHub(item.nomHub) === selectedDepot;
      currentTasks = currentTasks.filter(filterLogic);
      currentRounds = currentRounds.filter(filterLogic);
    }
    
    if (selectedStore !== "all") {
      const filterLogic = (item: Tache | Tournee) => item.nomHub === selectedStore;
      currentTasks = currentTasks.filter(filterLogic);
      currentRounds = currentRounds.filter(filterLogic);
    }
    
    return { filteredTasks: currentTasks, filteredRounds: currentRounds };
  }, [tasks, rounds, filterType, selectedDepot, selectedStore]);


  const value = {
    filterType,
    setFilterType,
    dateRange,
    setDateRange,
    availableDepots,
    selectedDepot,
    setSelectedDepot,
    availableStores,
    selectedStore,
    setSelectedStore,
    lastUpdateTime,
    tasks,
    rounds,
    isLoading: isLoadingTasks || isLoadingRounds,
    filteredTasks,
    filteredRounds,
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilterContext() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
}
