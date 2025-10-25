
"use client";

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { getDepotFromHub, getHubCategory, getDriverFullName } from '@/lib/grouping';
import { useCollection, clearCollectionCache } from '@/firebase/firestore/use-collection';
import { collection, DocumentData, Query, Timestamp, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { Tache, Tournee, NpsData, ProcessedNpsVerbatim as SavedProcessedNpsVerbatim } from '@/lib/types';
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
  isContextLoading: boolean;
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


  const tasksCollection = useMemo(() => {
    return firestore ? collection(firestore, 'tasks') : null;
  }, [firestore]);

  const roundsCollection = useMemo(() => {
    return firestore ? collection(firestore, 'rounds') : null;
  }, [firestore]);
  
  const npsDataCollection = useMemo(() => {
    return firestore ? collection(firestore, 'nps_data') : null;
  }, [firestore]);

  const processedVerbatimsCollection = useMemo(() => {
    return firestore ? collection(firestore, 'processed_nps_verbatims') : null;
  }, [firestore]);

  const categorizedCommentsCollection = useMemo(() => 
    firestore ? collection(firestore, "categorized_comments") : null,
    [firestore]
  );


  const firestoreDateFilters = useMemo(() => {
    const from = dateRange?.from;
    const to = dateRange?.to;
    
    if (!from) return [];
    
    const startDate = startOfDay(from);
    const endDate = endOfDay(to ?? from);
    
    return [
      where("date", ">=", startDate),
      where("date", "<=", endDate)
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
  

  const { data: allTasks = [], loading: isLoadingTasks, lastUpdateTime: tasksLastUpdate } = useCollection<Tache>(tasksCollection, firestoreDateFilters);
  const { data: allRounds = [], loading: isLoadingRounds, lastUpdateTime: roundsLastUpdate } = useCollection<Tournee>(roundsCollection, firestoreDateFilters);
  const { data: npsDataFromDateRange = [], loading: isLoadingNps, lastUpdateTime: npsLastUpdate } = useCollection<NpsData>(npsDataCollection, npsFirestoreFilters);
  const { data: allSavedVerbatims = [], loading: isLoadingSavedVerbatims } = useCollection<SavedProcessedNpsVerbatim>(processedVerbatimsCollection, npsFirestoreFilters);
  const { data: allSavedComments = [], isLoading: isLoadingCategorized } = useCollection<CategorizedComment>(categorizedCommentsCollection, []);

  
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
    const dates = [tasksLastUpdate, roundsLastUpdate, npsLastUpdate].filter(Boolean) as Date[];
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map(d => d.getTime())));
  }, [tasksLastUpdate, roundsLastUpdate, npsLastUpdate]);

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


  const allComments = useMemo(() => {
    const savedCommentsMap = new Map<string, CategorizedComment>();
    allSavedComments.forEach(comment => {
      const taskId = String(comment.taskId || comment.id);
      savedCommentsMap.set(taskId, {
        ...comment,
        id: taskId,
        taskId: taskId,
      });
    });

    const commentsFromTasks = allTasks.reduce((acc, task) => {
      const isNegativeComment = typeof task.metaDonnees?.notationLivreur === 'number' &&
                                task.metaDonnees.notationLivreur < 4 &&
                                task.metaDonnees.commentaireLivreur;
      
      const taskId = String(task.tacheId);

      if (savedCommentsMap.has(taskId)) {
        if (!acc.has(taskId)) {
          acc.set(taskId, savedCommentsMap.get(taskId)!);
        }
      } else if (isNegativeComment) {
        acc.set(taskId, {
          id: taskId,
          taskId: taskId,
          comment: task.metaDonnees!.commentaireLivreur!,
          rating: task.metaDonnees!.notationLivreur!,
          category: getCategoryFromKeywords(task.metaDonnees!.commentaireLivreur!),
          taskDate: task.date,
          driverName: getDriverFullName(task),
          nomHub: task.nomHub,
          status: 'à traiter' as const,
        });
      }
      return acc;
    }, new Map<string, CategorizedComment>());
    
    const finalCommentList = Array.from(commentsFromTasks.values());

    let filteredComments = finalCommentList;

    if (filterType !== 'tous') {
      const taskMap = new Map(allTasks.map(t => [t.tacheId, t]));
      filteredComments = filteredComments.filter(comment => {
        const task = taskMap.get(comment.taskId);
        if (!task) return false;
        return getHubCategory(task.nomHub) === filterType;
      });
    }
    if (selectedDepot !== "all") {
       const taskMap = new Map(allTasks.map(t => [t.tacheId, t]));
       filteredComments = filteredComments.filter(comment => {
        const task = taskMap.get(comment.taskId);
        if (!task) return false;
        return getDepotFromHub(task.nomHub) === selectedDepot;
      });
    }
    if (selectedStore !== "all") {
      const taskMap = new Map(allTasks.map(t => [t.tacheId, t]));
       filteredComments = filteredComments.filter(comment => {
        const task = taskMap.get(comment.taskId);
        if (!task) return false;
        return task.nomHub === selectedStore;
      });
    }

    return filteredComments;
  
  }, [allTasks, allSavedComments, filterType, selectedDepot, selectedStore]);


  const allNpsData = useMemo(() => {
    let verbatimsToFilter = npsDataFromDateRange.flatMap(d => d.verbatims);

    if (filterType !== 'tous') {
        verbatimsToFilter = verbatimsToFilter.filter(v => {
            const hubCategory = getHubCategory(v.store);
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
  }, [npsDataFromDateRange, filterType, selectedDepot, selectedStore]);
  
 const allProcessedVerbatims = useMemo(() => {
    // 1. Start with a map of verbatims already saved in Firestore, filtered by date/depot/store
    const verbatimsMap = new Map<string, ProcessedVerbatim>();
    processedVerbatims.forEach(v => {
        verbatimsMap.set(v.taskId, {
            ...v,
            category: Array.isArray(v.category) ? v.category : (v.category ? [v.category] : []),
            responsibilities: Array.isArray(v.responsibilities) ? v.responsibilities : (v.responsibilities ? [v.responsibilities] : []),
        });
    });
    
    // 2. Get all detractor verbatims from the current NPS data scope (already filtered by date, etc.).
    const detractorVerbatims = allNpsData
        .flatMap(d => d.verbatims)
        .filter(v => v.npsCategory === 'Detractor' && v.verbatim && v.verbatim.trim() !== '');

    // 3. Add only the NEW detractor verbatims to the map with 'à traiter' status.
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
        setSelectedStore,
        setSelectedStore,
        lastUpdateTime,
        allTasks: filteredTasksByOtherCriteria,
        allRounds: filteredRoundsByOtherCriteria,
        allComments,
        allNpsData,
        processedVerbatims,
        allProcessedVerbatims,
        isContextLoading: isLoadingTasks || isLoadingRounds || isLoadingCategorized || isLoadingNps || isLoadingSavedVerbatims,
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

    