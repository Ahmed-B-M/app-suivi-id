
"use client";

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { getDepotFromHub, getHubCategory, getDriverFullName } from '@/lib/grouping';
import { useCollection, clearCollectionCache } from '@/firebase/firestore/use-collection';
import { collection, DocumentData, Query, Timestamp, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { Tache, Tournee } from '@/lib/types';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { getCategoryFromKeywords } from '@/lib/stats-calculator';
import type { CategorizedComment } from '@/hooks/use-pending-comments';


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
  allComments: CategorizedComment[];
  isContextLoading: boolean;

  refreshData: () => void;
}

const FilterContext = createContext<FilterContextProps | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const [filterType, setFilterType] = useState<FilterType>('tous');
  
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('day');
  const [date, setDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  const [selectedDepot, setSelectedDepot] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshData = () => {
    clearCollectionCache();
    setRefreshKey(prevKey => prevKey + 1);
  };
  
  useEffect(() => {
    if (dateFilterMode === 'day' && date) {
      const from = startOfDay(date);
      const to = endOfDay(date);
      if (dateRange?.from?.getTime() !== from.getTime() || dateRange?.to?.getTime() !== to.getTime()) {
        setDateRange({ from, to });
      }
    }
  }, [date, dateFilterMode]);

  useEffect(() => {
    if (dateFilterMode === 'range' && dateRange?.from) {
       const fromDate = startOfDay(dateRange.from);
       if (date?.getTime() !== fromDate.getTime()) {
         setDate(fromDate);
       }
    }
  }, [dateRange, dateFilterMode]);


  const tasksCollection = useMemo(() => {
    return firestore ? collection(firestore, 'tasks') : null;
  }, [firestore]);

  const roundsCollection = useMemo(() => {
    return firestore ? collection(firestore, 'rounds') : null;
  }, [firestore]);

  const firestoreFilters = useMemo(() => {
    const from = dateRange?.from;
    const to = dateRange?.to;
    
    if (!from || !to) return [];
    
    return [
      where("date", ">=", from),
      where("date", "<=", to)
    ];
  }, [dateRange]);


  const { data: allTasks = [], loading: isLoadingTasks, lastUpdateTime: tasksLastUpdate } = useCollection<Tache>(tasksCollection, firestoreFilters, refreshKey);
  const { data: allRounds = [], loading: isLoadingRounds, lastUpdateTime: roundsLastUpdate } = useCollection<Tournee>(roundsCollection, firestoreFilters, refreshKey);
  
    const categorizedCommentsCollection = useMemo(() => 
    collection(firestore, "categorized_comments"), 
    [firestore]
  );
  
  const { data: savedComments, isLoading: isLoadingCategorized } = useCollection<CategorizedComment>(categorizedCommentsCollection);

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
    return tasksLastUpdate || roundsLastUpdate || null;
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

  const allComments = useMemo(() => {
    if (!filteredTasksByOtherCriteria || !savedComments) return [];
    
    const savedCommentsMap = new Map(savedComments.map(c => [c.taskId, c]));
    
    return filteredTasksByOtherCriteria
      .filter(task => 
        typeof task.metaDonnees?.notationLivreur === 'number' &&
        task.metaDonnees.notationLivreur < 4 &&
        task.metaDonnees.commentaireLivreur
      )
      .map(task => {
        const savedComment = savedCommentsMap.get(task.tacheId);
        if (savedComment) {
            return {
                ...savedComment,
                id: savedComment.id || task.tacheId
            };
        } else {
            return {
                id: task.tacheId,
                taskId: task.tacheId,
                comment: task.metaDonnees!.commentaireLivreur!,
                rating: task.metaDonnees!.notationLivreur!,
                category: getCategoryFromKeywords(task.metaDonnees!.commentaireLivreur!),
                taskDate: task.date,
                driverName: getDriverFullName(task),
                status: 'à traiter' as const,
            };
        }
    });
  }, [filteredTasksByOtherCriteria, savedComments]);


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
        allComments: allComments,
        isContextLoading: isLoadingTasks || isLoadingRounds || isLoadingCategorized,
        refreshData,
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
