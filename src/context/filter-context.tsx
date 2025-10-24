

"use client";

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { getDepotFromHub, getHubCategory, getDriverFullName } from '@/lib/grouping';
import { useCollection, clearCollectionCache } from '@/firebase/firestore/use-collection';
import { collection, DocumentData, Query, Timestamp, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { Tache, Tournee, NpsData, ProcessedNpsVerbatim } from '@/lib/types';
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
  allNpsData: NpsData[];
  processedVerbatims: ProcessedNpsVerbatim[];
  isContextLoading: boolean;

  refreshData: () => void;
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
    } else if (dateFilterMode === 'range' && !dateRange?.from) {
        // Ensure a default range is set if user switches to range with no selection
        const today = new Date();
        setDateRange({ from: subDays(today, 7), to: today });
    }
  }, [dateRange, dateFilterMode]);


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
    
    return [
      where("date", ">=", from),
      where("date", "<=", to ?? from) // Use 'from' if 'to' is not set
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
  

  const { data: allTasks = [], loading: isLoadingTasks, lastUpdateTime: tasksLastUpdate } = useCollection<Tache>(tasksCollection, firestoreDateFilters, refreshKey);
  const { data: allRounds = [], loading: isLoadingRounds, lastUpdateTime: roundsLastUpdate } = useCollection<Tournee>(roundsCollection, firestoreDateFilters, refreshKey);
  const { data: npsDataFromDateRange = [], loading: isLoadingNps, lastUpdateTime: npsLastUpdate } = useCollection<NpsData>(npsDataCollection, npsFirestoreFilters, refreshKey);
  const { data: allProcessedVerbatims = [], loading: isLoadingProcessedVerbatims } = useCollection<ProcessedNpsVerbatim>(processedVerbatimsCollection, [], refreshKey);
  // Fetch ALL categorized comments, filtering will happen client-side after merging
  const { data: allSavedComments = [], isLoading: isLoadingCategorized } = useCollection<CategorizedComment>(categorizedCommentsCollection, [], refreshKey);

  
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

  const filteredProcessedVerbatims = useMemo(() => {
    let verbatimsToFilter = allProcessedVerbatims;

    // Filter by date range first
    const from = dateRange?.from;
    const to = dateRange?.to;
    if (from) {
        const endDate = to ?? from;
        verbatimsToFilter = verbatimsToFilter.filter(v => {
            if (!v.taskDate) return false;
            const taskDate = new Date(v.taskDate);
            return taskDate >= startOfDay(from) && taskDate <= endOfDay(endDate);
        });
    }

    // Then filter by type, depot, and store
    if (filterType !== 'tous') {
      verbatimsToFilter = verbatimsToFilter.filter(v => {
        const hubCategory = v.depot === 'Magasin' ? 'magasin' : 'entrepot';
        return hubCategory === filterType;
      });
    }
    if (selectedDepot !== "all") {
       verbatimsToFilter = verbatimsToFilter.filter(v => v.depot === selectedDepot);
    }
    if (selectedStore !== "all") {
      verbatimsToFilter = verbatimsToFilter.filter(v => v.store === selectedStore);
    }
    return verbatimsToFilter;
  }, [allProcessedVerbatims, dateRange, filterType, selectedDepot, selectedStore]);


  const allComments = useMemo(() => {
    // 1. Create a map of all saved comments for quick lookup.
    const savedCommentsMap = new Map<string, CategorizedComment>();
    allSavedComments.forEach(comment => {
      const taskId = String(comment.taskId || comment.id);
      savedCommentsMap.set(taskId, {
        ...comment,
        id: taskId,
        taskId: taskId,
      });
    });

    // 2. Process tasks to find comments, using saved data if available.
    const commentsFromTasks = allTasks.reduce((acc, task) => {
      const isNegativeComment = typeof task.metaDonnees?.notationLivreur === 'number' &&
                                task.metaDonnees.notationLivreur < 4 &&
                                task.metaDonnees.commentaireLivreur;
      
      const taskId = String(task.tacheId);

      if (savedCommentsMap.has(taskId)) {
        // If it's already saved, ensure it's in our final list, regardless of whether it's a negative comment now.
        if (!acc.has(taskId)) {
          acc.set(taskId, savedCommentsMap.get(taskId)!);
        }
      } else if (isNegativeComment) {
        // If it's a new negative comment not in our saved list, add it as 'à traiter'.
        acc.set(taskId, {
          id: taskId,
          taskId: taskId,
          comment: task.metaDonnees!.commentaireLivreur!,
          rating: task.metaDonnees!.notationLivreur!,
          category: getCategoryFromKeywords(task.metaDonnees!.commentaireLivreur!),
          taskDate: task.date,
          driverName: getDriverFullName(task),
          status: 'à traiter' as const,
        });
      }
      return acc;
    }, new Map<string, CategorizedComment>());
    
    // Convert map to array for final filtering
    const finalCommentList = Array.from(commentsFromTasks.values());

    // 3. Apply entity filters (depot, store, etc.) to the final merged list.
    let filteredComments = finalCommentList;

    if (filterType !== 'tous') {
      // We need to associate comments with a hub category to filter them.
      // We can use the original task data for this.
      const taskMap = new Map(allTasks.map(t => [t.tacheId, t]));
      filteredComments = filteredComments.filter(comment => {
        const task = taskMap.get(comment.taskId);
        if (!task) return false; // Or handle as per requirements
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
            const hubCategory = v.depot === 'Magasin' ? 'magasin' : 'entrepot';
            return hubCategory === filterType;
        });
    }
    if (selectedDepot !== 'all') {
        verbatimsToFilter = verbatimsToFilter.filter(v => v.depot === selectedDepot);
    }
    if (selectedStore !== 'all') {
        verbatimsToFilter = verbatimsToFilter.filter(v => v.store === selectedStore);
    }
    
    // We need to reconstruct the NpsData shape, even if it's just one entry
    if (verbatimsToFilter.length === npsDataFromDateRange.flatMap(d => d.verbatims).length) {
        return npsDataFromDateRange;
    }

    return [{
        id: 'filtered',
        associationDate: new Date(), // This date is temporary and not used for filtering
        verbatims: verbatimsToFilter,
    }];
  }, [npsDataFromDateRange, filterType, selectedDepot, selectedStore]);


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
        processedVerbatims: filteredProcessedVerbatims,
        isContextLoading: isLoadingTasks || isLoadingRounds || isLoadingCategorized || isLoadingNps || isLoadingProcessedVerbatims,
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
