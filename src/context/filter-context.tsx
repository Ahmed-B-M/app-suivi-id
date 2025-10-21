
"use client";

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { getDepotFromHub } from '@/lib/grouping';
import { useCollection } from '@/firebase';
import { collection, DocumentData, Query, Timestamp, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { Tache, Tournee } from '@/lib/types';
import { format, subDays } from 'date-fns';

type FilterType = 'tous' | 'magasin' | 'entrepot';
type DateFilterMode = 'day' | 'range';

interface FilterContextProps {
  filterType: FilterType;
  setFilterType: (type: FilterType) => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  dateFilterMode: DateFilterMode;
  setDateFilterMode: (mode: DateFilterMode) => void;
  
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
  
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('day');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
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

  const firestoreFilters = useMemo(() => {
    let from: Date | undefined;
    let to: Date | undefined;

    if (dateFilterMode === 'day' && date) {
      from = date;
      to = date;
    } else if (dateFilterMode === 'range' && dateRange?.from) {
      from = dateRange.from;
      to = dateRange.to;
    }
    
    if (!from) return [];
    
    const startString = format(from, 'yyyy-MM-dd');
    const endString = format(to || from, 'yyyy-MM-dd') + '\uf8ff';

    return [
      where("date", ">=", startString),
      where("date", "<=", endString)
    ];
  }, [date, dateRange, dateFilterMode]);


  const { data: allTasks = [], loading: isLoadingTasks, lastUpdateTime: tasksLastUpdate } = useCollection<Tache>(tasksCollection, firestoreFilters);
  const { data: allRounds = [], loading: isLoadingRounds, lastUpdateTime: roundsLastUpdate } = useCollection<Tournee>(roundsCollection, firestoreFilters);
  
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

  const filteredTasksByOtherCriteria = useMemo(() => {
    let tasksToFilter = allTasks;
    if (filterType !== 'tous') {
      tasksToFilter = tasksToFilter.filter(item => getHubCategory(item.nomHub) === filterType);
    }
    if (selectedDepot !== "all") {
       tasksToFilter = tasksToFilter.filter(item => getDepotFromHub(item.nomHub) === selectedDepot);
    }
    if (selectedStore !== "all") {
      tasksToFilter = tasksToFilter.filter(item => item.nomHub === selectedStore);
    }
    return tasksToFilter;
  }, [allTasks, filterType, selectedDepot, selectedStore]);
  
  const filteredRoundsByOtherCriteria = useMemo(() => {
    let roundsToFilter = allRounds;
    if (filterType !== 'tous') {
      roundsToFilter = roundsToFilter.filter(item => getHubCategory(item.nomHub) === filterType);
    }
    if (selectedDepot !== "all") {
       roundsToFilter = roundsToFilter.filter(item => getDepotFromHub(item.nomHub) === selectedDepot);
    }
    if (selectedStore !== "all") {
      roundsToFilter = roundsToFilter.filter(item => item.nomHub === selectedStore);
    }
    return roundsToFilter;
  }, [allRounds, filterType, selectedDepot, selectedStore]);


  return (
    <FilterContext.Provider
      value={{
        filterType,
        setFilterType,
        dateRange,
        setDateRange,
        date,
        setDate,
        dateFilterMode,
        setDateFilterMode,
        availableDepots,
        selectedDepot,
        setSelectedDepot,
        availableStores,
        selectedStore,
        setSelectedStore,
        lastUpdateTime,
        allTasks: filteredTasksByOtherCriteria,
        allRounds: filteredRoundsByOtherCriteria,
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
