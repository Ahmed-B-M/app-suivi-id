
"use client";

import { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback } from 'react';
import type { DateRange } from 'react-day-picker';
import { getDepotFromHub, getHubCategory } from '@/lib/grouping';
import { useQuery, clearQueryCache } from '@/firebase/firestore/use-query';
import { collection, DocumentData, Query, Timestamp, where, collectionGroup, orderBy } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { Tache, Tournee, NpsData, ProcessedNpsVerbatim as SavedProcessedNpsVerbatim, CarrierRule, DepotRule } from '@/lib/types';
import { format, subDays, startOfDay, endOfDay, isEqual } from 'date-fns';
import { getCategoryFromKeywords } from '@/lib/stats-calculator';
import type { CategorizedComment } from '@/hooks/use-pending-comments';
import { ProcessedVerbatim } from '@/app/verbatim-treatment/page';


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
  allNpsData: NpsData[];
  processedVerbatims: SavedProcessedNpsVerbatim[];
  allProcessedVerbatims: ProcessedVerbatim[];
  allCarrierRules: CarrierRule[];
  allDepotRules: DepotRule[];
  isContextLoading: boolean;
  clearAllData: () => void;
}

const FilterContext = createContext<FilterContextProps | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const [filterType, setFilterType] = useState<FilterType>('tous');
  
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('day');
  const [date, setDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = startOfDay(new Date());
    return { from: today, to: endOfDay(today) };
  });

  const [selectedDepot, setSelectedDepot] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  
  const [refreshKey, setRefreshKey] = useState(0);

  const clearAllData = useCallback(() => {
    clearQueryCache();
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (dateFilterMode === 'day' && date) {
      const from = startOfDay(date);
      const to = endOfDay(date);
      if (!dateRange || !dateRange.from || !dateRange.to || !isEqual(dateRange.from, from) || !isEqual(dateRange.to, to)) {
        setDateRange({ from, to });
      }
    }
  }, [date, dateFilterMode, dateRange]);

  useEffect(() => {
    if (dateFilterMode === 'range' && dateRange?.from) {
       const fromDate = startOfDay(dateRange.from);
       if (!date || !isEqual(date, fromDate)) {
         setDate(fromDate);
       }
    }
  }, [dateRange, dateFilterMode, date]);

  const firestoreDateFilters = useMemo(() => {
    const from = dateRange?.from;
    const to = dateRange?.to;
    
    if (!from) return [];
    
    const startDate = startOfDay(from);
    const endDate = endOfDay(to ?? from);
    
    return [
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc")
    ];
  }, [dateRange]);

  const commentsDateFilters = useMemo(() => {
    const from = dateRange?.from;
    const to = dateRange?.to;
    
    if (!from) return [];
    
    const startDate = format(startOfDay(from), 'yyyy-MM-dd');
    const endDate = format(endOfDay(to ?? from), 'yyyy-MM-dd');
    
    return [
      where("taskDate", ">=", startDate),
      where("taskDate", "<=", endDate),
      orderBy("taskDate", "desc")
    ];
  }, [dateRange]);
  
  const npsFirestoreFilters = useMemo(() => {
    const from = dateRange?.from;
    const to = dateRange?.to;

    if (!from) return [];

    return [
      where("associationDate", ">=", format(from, 'yyyy-MM-dd')),
      where("associationDate", "<=", format(to ?? from, 'yyyy-MM-dd'))
    ];
  }, [dateRange]);

  const tasksCollection = useMemo(() => firestore ? collection(firestore, 'tasks') : null, [firestore]);
  const roundsCollection = useMemo(() => firestore ? collection(firestore, 'rounds') : null, [firestore]);
  const npsDataCollection = useMemo(() => firestore ? collection(firestore, 'nps_data') : null, [firestore]);
  const categorizedCommentsCollection = useMemo(() => firestore ? collection(firestore, 'categorized_comments') : null, [firestore]);
  const processedVerbatimsCollection = useMemo(() => firestore ? collection(firestore, 'processed_nps_verbatims') : null, [firestore]);
  const depotRulesCollection = useMemo(() => firestore ? collection(firestore, 'depot_rules') : null, [firestore]);
  const carrierRulesCollection = useMemo(() => firestore ? collection(firestore, 'carrier_rules') : null, [firestore]);


  const { data: allTasksData = [], loading: isLoadingTasks, lastUpdateTime: tasksLastUpdate } = useQuery<Tache>(tasksCollection, firestoreDateFilters, {realtime: true, refreshKey});
  const { data: allRoundsData = [], loading: isLoadingRounds, lastUpdateTime: roundsLastUpdate } = useQuery<Tournee>(roundsCollection, firestoreDateFilters, {realtime: true, refreshKey});
  const { data: npsDataFromDateRange = [], loading: isLoadingNps, lastUpdateTime: npsLastUpdate } = useQuery<NpsData>(npsDataCollection, npsFirestoreFilters, {realtime: true, refreshKey});
  const { data: allSavedComments = [], loading: isLoadingCategorized } = useQuery<CategorizedComment>(categorizedCommentsCollection, [], {realtime: true, refreshKey});
  const { data: allSavedVerbatims = [], loading: isLoadingSavedVerbatims } = useQuery<SavedProcessedNpsVerbatim>(processedVerbatimsCollection, npsFirestoreFilters, {realtime: true, refreshKey});
  const { data: allCarrierRules = [], loading: isLoadingCarrierRules } = useQuery<CarrierRule>(carrierRulesCollection, [where("isActive", "==", true)], {realtime: true, refreshKey});
  const { data: allDepotRules = [], loading: isLoadingDepotRules } = useQuery<DepotRule>(depotRulesCollection, [where("isActive", "==", true)], {realtime: true, refreshKey});
  
  const availableDepots = useMemo(() => {
    if (!allDepotRules) return [];
    const depots = allDepotRules.filter(r => r.type === 'entrepot').map(r => r.depotName);
    return [...new Set(depots)].sort();
  }, [allDepotRules]);
  
  const availableStores = useMemo(() => {
    if (!allTasksData) return [];
    const stores = allTasksData.filter(t => getHubCategory(t.nomHub, allDepotRules) === 'magasin').map(t => t.nomHub);
    const filteredStores = stores.filter((s): s is string => !!s);
    return [...new Set(filteredStores)].sort();
  }, [allTasksData, allDepotRules]);
  
  const lastUpdateTime = useMemo(() => {
    const dates = [tasksLastUpdate, roundsLastUpdate, npsLastUpdate].filter(Boolean) as Date[];
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map(d => d.getTime())));
  }, [tasksLastUpdate, roundsLastUpdate, npsLastUpdate]);

  const allTasks = useMemo(() => {
    let tasksToFilter = allTasksData;
    if (filterType !== 'tous') {
      tasksToFilter = tasksToFilter.filter(item => getHubCategory(item.nomHub, allDepotRules) === filterType);
    }
    if (selectedDepot !== "all") {
       tasksToFilter = tasksToFilter.filter(item => getDepotFromHub(item.nomHub, allDepotRules) === selectedDepot);
    }
    if (selectedStore !== "all") {
      tasksToFilter = tasksToFilter.filter(item => item.nomHub === selectedStore);
    }
    return tasksToFilter;
  }, [allTasksData, filterType, selectedDepot, selectedStore, allDepotRules]);
  
  const allRounds = useMemo(() => {
    let roundsToFilter = allRoundsData;
    if (filterType !== 'tous') {
      roundsToFilter = roundsToFilter.filter(item => getHubCategory(item.nomHub, allDepotRules) === filterType);
    }
    if (selectedDepot !== "all") {
       roundsToFilter = roundsToFilter.filter(item => getDepotFromHub(item.nomHub, allDepotRules) === selectedDepot);
    }
    if (selectedStore !== "all") {
      roundsToFilter = roundsToFilter.filter(item => item.nomHub === selectedStore);
    }
    return roundsToFilter;
  }, [allRoundsData, filterType, selectedDepot, selectedStore, allDepotRules]);

  const allComments = useMemo(() => {
    const savedCommentsMap = new Map<string, CategorizedComment>();
    allSavedComments.forEach(comment => {
      savedCommentsMap.set(comment.taskId, { ...comment, id: comment.id || comment.taskId });
    });
  
    const commentsFromTasks = allTasks.reduce((acc, task) => {
      const taskId = task.tacheId;
      const isNegativeComment = typeof task.notationLivreur === 'number' &&
                                task.notationLivreur < 4 &&
                                task.commentaireLivreur;
  
      if (savedCommentsMap.has(taskId)) {
        if (!acc.has(taskId)) {
          acc.set(taskId, savedCommentsMap.get(taskId)!);
        }
      } 
      else if (isNegativeComment) {
        const taskDate = task.date ? (task.date as any).toDate ? (task.date as any).toDate().toISOString() : new Date(task.date as string).toISOString() : undefined;
  
        acc.set(taskId, {
          id: taskId,
          taskId: taskId,
          comment: task.commentaireLivreur!,
          rating: task.notationLivreur!,
          category: getCategoryFromKeywords(task.commentaireLivreur!),
          responsibilities: [], // Initial empty state for new comments
          taskDate: taskDate,
          driverName: task.nomCompletChauffeur,
          nomHub: task.nomHub,
          status: 'à traiter' as const,
        });
      }
      return acc;
    }, new Map<string, CategorizedComment>());
    
    return Array.from(commentsFromTasks.values());
  
  }, [allTasks, allSavedComments]);


  const allNpsData = useMemo(() => {
    let verbatimsToFilter = npsDataFromDateRange.flatMap(d => d.verbatims);

    if (filterType !== 'tous') {
        verbatimsToFilter = verbatimsToFilter.filter(v => {
            const hubCategory = getHubCategory(v.store, allDepotRules);
            return hubCategory === filterType;
        });
    }
    if (selectedDepot !== 'all') {
        verbatimsToFilter = verbatimsToFilter.filter(v => v.depot === selectedDepot);
    }
    if (selectedStore !== 'all') {
      verbatimsToFilter = verbatimsToFilter.filter(v => v.store === selectedStore);
    }
    
    if (verbatimsToFilter.length === npsDataFromDateRange.flatMap(d => d.verbatims).length) {
        return npsDataFromDateRange;
    }

    return [{
        id: 'filtered',
        associationDate: new Date(),
        verbatims: verbatimsToFilter,
    }];
  }, [npsDataFromDateRange, filterType, selectedDepot, selectedStore, allDepotRules]);
  
 const processedVerbatims = useMemo(() => {
    let verbatimsToFilter = allSavedVerbatims;

    if (selectedDepot !== "all") {
       verbatimsToFilter = verbatimsToFilter.filter(v => v.depot === selectedDepot);
    }
    if (selectedStore !== "all") {
      verbatimsToFilter = verbatimsToFilter.filter(v => v.store === selectedStore);
    }
    return verbatimsToFilter;
  }, [allSavedVerbatims, selectedDepot, selectedStore]);
  
 const allProcessedVerbatims = useMemo(() => {
    const verbatimsMap = new Map<string, ProcessedVerbatim>();
    processedVerbatims.forEach(v => {
        verbatimsMap.set(v.taskId, {
            ...v,
            category: Array.isArray(v.category) ? v.category : (v.category ? [v.category] : []),
            responsibilities: Array.isArray(v.responsibilities) ? v.responsibilities : (v.responsibilities ? [v.responsibilities] : []),
        });
    });
    
    const detractorVerbatims = allNpsData
        .flatMap(d => d.verbatims)
        .filter(v => v.npsCategory === 'Detractor' && v.verbatim && v.verbatim.trim() !== '');

    detractorVerbatims.forEach(v => {
        if (!verbatimsMap.has(v.taskId)) {
            verbatimsMap.set(v.taskId, {
                id: v.taskId,
                taskId: v.taskId,
                npsScore: v.npsScore,
                verbatim: v.verbatim,
                responsibilities: [],
                category: [],
                status: 'à traiter',
                store: v.store,
                taskDate: v.taskDate,
                carrier: v.carrier,
                depot: v.depot,
                driver: v.driver,
                associationDate: Array.isArray(allNpsData) && allNpsData.length > 0 && allNpsData[0].associationDate ? allNpsData[0].associationDate.toString() : new Date().toISOString(),
            });
        }
    });

    return Array.from(verbatimsMap.values());
}, [allNpsData, processedVerbatims]);


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
        allTasks,
        allRounds,
        allComments,
        allNpsData,
        processedVerbatims,
        allProcessedVerbatims,
        allCarrierRules,
        allDepotRules,
        isContextLoading: isLoadingTasks || isLoadingRounds || isLoadingCategorized || isLoadingNps || isLoadingSavedVerbatims || isLoadingCarrierRules || isLoadingDepotRules,
        clearAllData,
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
