
"use client";

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { getDepotFromHub } from '@/lib/grouping';
import { useCollection } from '@/firebase';
import { collection, DocumentData, Query } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { Tache, Tournee } from '@/lib/types';
import { subDays } from 'date-fns';

type FilterType = 'tous' | 'magasin' | 'entrepot';

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
  allTasks: Tache[];
  allRounds: Tournee[];
  isContextLoading: boolean;
}

const FilterContext = createContext<FilterContextProps | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const [filterType, setFilterType] = useState<FilterType>('tous');
  
  // Set default date range to the last 7 days
  const [dateRange, _setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const [selectedDepot, setSelectedDepot] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  
  const tasksCollection = useMemo(() => {
    return firestore ? collection(firestore, 'tasks') : null;
  }, [firestore]);

  const roundsCollection = useMemo(() => {
    return firestore ? collection(firestore, 'rounds') : null;
  }, [firestore]);

  const { data: allTasks = [], loading: isLoadingTasks, lastUpdateTime: tasksLastUpdate } = useCollection<Tache>(tasksCollection as Query<DocumentData>);
  const { data: allRounds = [], loading: isLoadingRounds, lastUpdateTime: roundsLastUpdate } = useCollection<Tournee>(roundsCollection as Query<DocumentData>);

  const setDateRange = (newRange: DateRange | undefined) => {
    if (newRange?.from && newRange?.to && newRange.from > newRange.to) {
      console.warn("Invalid date range: 'from' date cannot be after 'to' date.");
      return;
    }
    _setDateRange(newRange);
  };
  
  useEffect(() => {
    if (!dateRange && !isLoadingTasks && !isLoadingRounds) {
        _setDateRange({ from: subDays(new Date(), 7), to: new Date() });
    }
  }, [dateRange, isLoadingTasks, isLoadingRounds]);

  const availableDepots = useMemo(
    () => {
        if (!allTasks) return [];
        const depots = allTasks.map(t => getDepotFromHub(t.nomHub));
        const filteredDepots = depots.filter((d): d is string => !!d && d !== "Magasin");
        return [...new Set(filteredDepots)].sort();
    },
    [allTasks]
  );
  
  const availableStores = useMemo(
    () => {
        if (!allTasks) return [];
        const stores = allTasks.filter(t => getDepotFromHub(t.nomHub) === 'Magasin').map(t => t.nomHub);
        const filteredStores = stores.filter((s): s is string => !!s);
        return [...new Set(filteredStores)].sort();
    },
    [allTasks]
  );
  
  const lastUpdateTime = useMemo(() => {
    if (tasksLastUpdate && roundsLastUpdate) {
        return tasksLastUpdate > roundsLastUpdate ? tasksLastUpdate : roundsLastUpdate;
    }
    return tasksLastUpdate || roundsLastUpdate;
  }, [tasksLastUpdate, roundsLastUpdate]);

  return (
    <FilterContext.Provider
      value={{
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
        allTasks,
        allRounds,
        isContextLoading: isLoadingTasks || isLoadingRounds,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
