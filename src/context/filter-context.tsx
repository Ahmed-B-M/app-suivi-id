
"use client";

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { getDepotFromHub, getHubCategory, getDriverFullName, groupTasksByDay, groupTasksByMonth } from '@/lib/grouping';
import { useCollection, clearCollectionCache } from '@/firebase/firestore/use-collection';
import { collection, DocumentData, Query, Timestamp, where, collectionGroup } from 'firebase/firestore';
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
  }, [date, dateFilterMode]);

  useEffect(() => {
    if (dateFilterMode === 'range' && dateRange?.from) {
       const fromDate = startOfDay(dateRange.from);
       if (!date || !isEqual(date, fromDate)) {
         setDate(fromDate);
       }
    }
  }, [dateRange, dateFilterMode]);

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

  const tasksCollection = useMemo(() => firestore ? collection(firestore, 'tasks') : null, [firestore]);
  const roundsCollection = useMemo(() => firestore ? collection(firestore, 'rounds') : null, [firestore]);
  const npsDataCollection = useMemo(() => firestore ? collection(firestore, 'nps_data') : null, [firestore]);
  const categorizedCommentsCollection = useMemo(() => firestore ? collection(firestore, 'categorized_comments') : null, [firestore]);
  const processedVerbatimsCollection = useMemo(() => firestore ? collection(firestore, 'processed_nps_verbatims') : null, [firestore]);

  const { data: allTasksData = [], loading: isLoadingTasks, lastUpdateTime: tasksLastUpdate } = useCollection<Tache>(tasksCollection, firestoreDateFilters);
  const { data: allRoundsData = [], loading: isLoadingRounds, lastUpdateTime: roundsLastUpdate } = useCollection<Tournee>(roundsCollection, firestoreDateFilters);
  const { data: npsDataFromDateRange = [], loading: isLoadingNps, lastUpdateTime: npsLastUpdate } = useCollection<NpsData>(npsDataCollection, npsFirestoreFilters);
  const { data: allSavedComments = [], loading: isLoadingCategorized } = useCollection<CategorizedComment>(categorizedCommentsCollection); // Pas de filtre de date ici pour tout récupérer
  const { data: allSavedVerbatims = [], loading: isLoadingSavedVerbatims } = useCollection<SavedProcessedNpsVerbatim>(processedVerbatimsCollection, npsFirestoreFilters);
  
  const availableDepots = useMemo(
    () => {
        if (!allTasksData) return [];
        const depots = allTasksData.map(t => getDepotFromHub(t.nomHub));
        const filteredDepots = depots.filter((d): d is string => !!d && d !== "Magasin");
        return [...new Set(filteredDepots)].sort();
    },
    [allTasksData]
  );
  
  const availableStores = useMemo(
    () => {
        if (!allTasksData) return [];
        const stores = allTasksData.filter(t => getDepotFromHub(t.nomHub) === 'Magasin').map(t => t.nomHub);
        const filteredStores = stores.filter((s): s is string => !!s);
        return [...new Set(filteredStores)].sort();
    },
    [allTasksData]
  );
  
  const lastUpdateTime = useMemo(() => {
    const dates = [tasksLastUpdate, roundsLastUpdate, npsLastUpdate].filter(Boolean) as Date[];
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map(d => d.getTime())));
  }, [tasksLastUpdate, roundsLastUpdate, npsLastUpdate]);

    const allTasks = useMemo(() => {
    let tasksToFilter = allTasksData;
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
  }, [allTasksData, filterType, selectedDepot, selectedStore]);
  
  const allRounds = useMemo(() => {
    let roundsToFilter = allRoundsData;
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
  }, [allRoundsData, filterType, selectedDepot, selectedStore]);

  const allComments = useMemo(() => {
    // 1. Create a map of all saved comments from Firestore for quick lookup.
    const savedCommentsMap = new Map<string, CategorizedComment>();
    allSavedComments.forEach(comment => {
      const taskId = String(comment.taskId || comment.id);
      savedCommentsMap.set(taskId, {
        ...comment,
        id: taskId,
        taskId: taskId,
      });
    });
  
    // 2. Iterate through all tasks from the current context (already filtered by date/depot).
    // This will create a list of comments based on the tasks currently in view.
    const commentsFromTasks = allTasks.reduce((acc, task) => {
      const taskId = String(task.tacheId); // Use the correct ID
      const isNegativeComment = typeof task.notationLivreur === 'number' &&
                                task.notationLivreur < 4 &&
                                task.metaCommentaireLivreur;
  
      // If the comment is already saved, use the saved version.
      if (savedCommentsMap.has(taskId)) {
        if (!acc.has(taskId)) {
          acc.set(taskId, savedCommentsMap.get(taskId)!);
        }
      } 
      // If it's a new negative comment not yet saved, create a new entry for it.
      else if (isNegativeComment) {
        const taskDate = task.date && typeof (task.date as any).toDate === 'function' 
                         ? (task.date as any).toDate() 
                         : task.date;
  
        acc.set(taskId, {
          id: taskId,
          taskId: taskId,
          comment: task.metaCommentaireLivreur!,
          rating: task.notationLivreur!,
          category: getCategoryFromKeywords(task.metaCommentaireLivreur!),
          taskDate: taskDate as string | Date | undefined,
          driverName: getDriverFullName(task),
          nomHub: task.nomHub, // Include hub name
          status: 'à traiter' as const,
        });
      }
      return acc;
    }, new Map<string, CategorizedComment>());
    
    // The final list is the aggregated result. No further filtering is needed here as `allTasks` is already filtered.
    return Array.from(commentsFromTasks.values());
  
  }, [allTasks, allSavedComments]);


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
