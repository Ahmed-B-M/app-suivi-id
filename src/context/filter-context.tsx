
"use client";

import { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback } from 'react';
import type { DateRange } from 'react-day-picker';
import { getHubCategory, getDepotFromHub, DEPOT_RULES } from '@/lib/grouping';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { Tache, Tournee } from '@/lib/types';

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
}

const FilterContext = createContext<FilterContextProps | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const [filterType, setFilterType] = useState<FilterType>('tous');
  const [dateRange, _setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedDepot, setSelectedDepot] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');

  useEffect(() => {
    // Initialize date range on the client to avoid hydration mismatch
    const today = new Date();
    _setDateRange({ from: today, to: today });
  }, []);

  const setDateRange = useCallback((range: DateRange | undefined) => {
    if (range?.from && !range.to) {
      // If user clicks a single date, set both from and to
      _setDateRange({ from: range.from, to: range.from });
    } else {
      _setDateRange(range);
    }
  }, []);

  const tasksCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "tasks");
  }, [firestore]);

  const roundsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "rounds");
  }, [firestore]);

  const { data: tasks } = useCollection<Tache>(tasksCollection);
  const { data: rounds } = useCollection<Tournee>(roundsCollection);

  const { availableDepots, availableStores, lastUpdateTime } = useMemo(() => {
    const allItems: (Tache | Tournee)[] = [...(tasks || []), ...(rounds || [])];
    const depotSet = new Set<string>();
    const storeSet = new Set<string>();
    let maxDate: Date | null = null;

    allItems.forEach(item => {
      const hub = item.nomHub;
      if (hub) {
        if (getHubCategory(hub) === 'depot') {
          depotSet.add(getDepotFromHub(hub));
        } else {
          storeSet.add(hub);
        }
      }

      const updateDateStr = item.dateMiseAJour || item.updated;
      if (updateDateStr) {
        const updateDate = new Date(updateDateStr);
        if (!maxDate || updateDate > maxDate) {
          maxDate = updateDate;
        }
      }
    });

    const depots = DEPOT_RULES.map(r => r.name);
    
    return {
      availableDepots: Array.from(depots).sort(),
      availableStores: Array.from(storeSet).sort(),
      lastUpdateTime: maxDate,
    };
  }, [tasks, rounds]);

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
