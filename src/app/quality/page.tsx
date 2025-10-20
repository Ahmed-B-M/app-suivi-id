
"use client";

import { useMemo, useState } from "react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Tache, Tournee } from "@/lib/types";
import { getHubCategory, getDepotFromHub, getDriverFullName, getCarrierFromDriver } from "@/lib/grouping";
import { useFilterContext } from "@/context/filter-context";
import { CommentAnalysis, type CategorizedComment } from "@/components/app/comment-analysis";
import { calculateDriverScore, calculateRawDriverStats, DriverStats } from "@/lib/scoring";
import { DriverPerformanceRankings } from "@/components/app/driver-performance-rankings";
import { AlertRecurrenceTable, type AlertData } from "@/components/app/alert-recurrence-table";
import { QualityDashboard, QualityData } from "@/components/app/quality-dashboard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";


export default function QualityPage() {
  const { firestore } = useFirebase();
  const { dateRange, filterType, selectedDepot, selectedStore } = useFilterContext();
  const [searchQuery, setSearchQuery] = useState('');

  const tasksCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "tasks");
  }, [firestore]);

  const { data: tasks, isLoading: isLoadingTasks } = useCollection<Tache>(tasksCollection);
  
  const roundsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "rounds");
  }, [firestore]);

  const { data: rounds, isLoading: isLoadingRounds } = useCollection<Tournee>(roundsCollection);
  
  const commentsCollection = useMemoFirebase(() => {
      if (!firestore) return null;
      return collection(firestore, 'categorized_comments');
  }, [firestore]);

  const { data: categorizedCommentsData, isLoading: isLoadingComments } = useCollection<CategorizedComment>(commentsCollection);

  const categorizedComments = useMemo(() => {
      return (categorizedCommentsData || []).map(c => ({...c, status: 'traité' as const}));
  }, [categorizedCommentsData]);


  const filteredTasks = useMemo(() => {
    const { from, to } = dateRange || {};
    let filtered = tasks || [];

    if (from) {
      const startOfDay = new Date(from);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = to ? new Date(to) : new Date(from);
      endOfDay.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(task => {
        const itemDateString = task.date || task.dateCreation;
        if (!itemDateString) return false;
        const itemDate = new Date(itemDateString);
        return itemDate >= startOfDay && itemDate <= endOfDay;
      });
    }
    
    if (filterType !== 'tous') {
      filtered = filtered.filter(task => getHubCategory(task.nomHub) === filterType);
    }

    if (selectedDepot !== "all") {
      filtered = filtered.filter(task => getDepotFromHub(task.nomHub) === selectedDepot);
    }
    
    if (selectedStore !== "all") {
      filtered = filtered.filter(task => task.nomHub === selectedStore);
    }

    return filtered;
  }, [tasks, dateRange, filterType, selectedDepot, selectedStore]);
  
 const filteredComments = useMemo(() => {
    if (!categorizedComments || !tasks) return [];

    const { from, to } = dateRange || {};
    let comments = categorizedComments;

    // Create a lookup map for task details
    const taskDetailsMap = new Map(tasks.map(task => [task.tacheId, { hubName: task.nomHub }]));

    // Filter by Date Range
    if (from) {
      const startOfDay = new Date(from);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = to ? new Date(to) : new Date(from);
      endOfDay.setHours(23, 59, 59, 999);
      
      comments = comments.filter(comment => {
        if (!comment.taskDate) return false;
        const commentDate = new Date(comment.taskDate);
        return commentDate >= startOfDay && commentDate <= endOfDay;
      });
    }

    // Filter by Type, Depot, and Store using the lookup map
    comments = comments.filter(comment => {
        const taskDetails = taskDetailsMap.get(comment.taskId);
        if (!taskDetails?.hubName) return false;

        const hubName = taskDetails.hubName;
        const hubCategory = getHubCategory(hubName);
        const depot = getDepotFromHub(hubName);

        if (filterType !== 'tous' && hubCategory !== filterType) {
            return false;
        }
        if (selectedDepot !== "all" && depot !== selectedDepot) {
            return false;
        }
        if (selectedStore !== "all" && hubName !== selectedStore) {
            return false;
        }
        return true;
    });

    return comments;
}, [categorizedComments, tasks, dateRange, filterType, selectedDepot, selectedStore]);


  const qualityData = useMemo(() => {
    if (!filteredTasks || isLoadingTasks) return null;

    const driverTasks: Record<string, Tache[]> = {};
    filteredTasks.forEach(task => {
        const driverName = getDriverFullName(task);
        if (driverName) {
            if (!driverTasks[driverName]) driverTasks[driverName] = [];
            driverTasks[driverName].push(task);
        }
    });

    const rawDriverStats = Object.entries(driverTasks).map(([name, tasks]) => {
      return calculateRawDriverStats(name, tasks);
    });

    const maxCompletedTasks = Math.max(0, ...rawDriverStats.map(s => s.completedTasks));

    const driverStatsList = rawDriverStats
        .map(rawStats => ({
            ...rawStats,
            score: calculateDriverScore(rawStats, maxCompletedTasks) ?? 0,
        }));

    const depotAggregation: Record<string, { name: string; carriers: Record<string, { name: string; drivers: typeof driverStatsList }> }> = {};

    driverStatsList.forEach(driverStat => {
        const tasks = driverTasks[driverStat.name];
        if (!tasks || tasks.length === 0) return;
        
        const mainHub = tasks[0].nomHub;
        if (!mainHub) return;

        const depotName = getDepotFromHub(mainHub);
        const carrierName = getCarrierFromDriver(driverStat.name);
        
        if (!depotAggregation[depotName]) {
            depotAggregation[depotName] = { name: depotName, carriers: {} };
        }
        if (!depotAggregation[depotName].carriers[carrierName]) {
            depotAggregation[depotName].carriers[carrierName] = { name: carrierName, drivers: [] };
        }
        depotAggregation[depotName].carriers[carrierName].drivers.push(driverStat);
    });

    const calculateAggregatedStats = (drivers: typeof driverStatsList) => {
      const totalRatings = drivers.reduce((sum, d) => sum + (d.totalRatings || 0), 0);
      
      const alerts = drivers.reduce((sum, d) => {
        const tasks = driverTasks[d.name] || [];
        return sum + tasks.filter(t => typeof t.metaDonnees?.notationLivreur === 'number' && t.metaDonnees.notationLivreur < 4).length;
      }, 0);

      const weightedAvg = (kpi: keyof Omit<DriverStats, 'name' | 'score' | 'totalRatings' | 'totalTasks' | 'completedTasks'>, weightKey: 'totalRatings' | 'completedTasks') => {
        let totalWeightedSum = 0;
        let totalWeight = 0;

        drivers.forEach(d => {
            const value = d[kpi] as number | null;
            const weight = d[weightKey] as number;
            if (value !== null && weight > 0) {
                totalWeightedSum += value * weight;
                totalWeight += weight;
            }
        });

        if (totalWeight === 0) return null;
        return totalWeightedSum / totalWeight;
      };
      
      const averageRating = weightedAvg('averageRating', 'totalRatings');
      const score = drivers.length > 0 ? drivers.reduce((sum, d) => sum + (d.score ?? 0), 0) / drivers.length : 0;

      return {
        totalRatings,
        totalAlerts: alerts,
        alertRate: totalRatings > 0 ? (alerts / totalRatings) * 100 : 0,
        averageRating,
        punctualityRate: weightedAvg('punctualityRate', 'completedTasks'),
        scanbacRate: weightedAvg('scanbacRate', 'completedTasks'),
        forcedAddressRate: weightedAvg('forcedAddressRate', 'completedTasks'),
        forcedContactlessRate: weightedAvg('forcedContactlessRate', 'completedTasks'),
        score
      };
    };

    const details: QualityData['details'] = Object.values(depotAggregation).map(depot => {
        const allDepotDrivers = Object.values(depot.carriers).flatMap(c => c.drivers);
        return {
            ...depot,
            ...calculateAggregatedStats(allDepotDrivers),
            carriers: Object.values(depot.carriers).map(carrier => ({
                ...carrier,
                ...calculateAggregatedStats(carrier.drivers),
                drivers: carrier.drivers.sort((a,b) => (b.score ?? 0) - (a.score ?? 0))
            })).sort((a,b) => (b.score ?? 0) - (a.score ?? 0))
        };
    }).sort((a,b) => (b.score ?? 0) - (a.score ?? 0));

    const summary = calculateAggregatedStats(driverStatsList);

    return { summary, details };
  }, [filteredTasks, isLoadingTasks]);


  const filteredQualityData = useMemo(() => {
    if (!qualityData) return null;
    if (!searchQuery) return qualityData;

    const lowerCaseQuery = searchQuery.toLowerCase();

    const filteredDetails = qualityData.details.map(depot => {
      const filteredCarriers = depot.carriers.map(carrier => {
        const filteredDrivers = carrier.drivers.filter(driver => 
          driver.name.toLowerCase().includes(lowerCaseQuery)
        );
        return { ...carrier, drivers: filteredDrivers };
      }).filter(carrier => carrier.drivers.length > 0);
      
      return { ...depot, carriers: filteredCarriers };
    }).filter(depot => depot.carriers.length > 0);

    return { ...qualityData, details: filteredDetails };
  }, [qualityData, searchQuery]);

 const { driverRankings, alertData } = useMemo(() => {
    if (!filteredTasks || isLoadingTasks || !categorizedComments) return { driverRankings: null, alertData: [] };
    
    const driverTasks: Record<string, Tache[]> = {};
    filteredTasks.forEach(task => {
        const driverName = getDriverFullName(task);
        if (driverName) {
            if (!driverTasks[driverName]) driverTasks[driverName] = [];
            driverTasks[driverName].push(task);
        }
    });

    const rawDriverStats = Object.entries(driverTasks)
      .map(([name, tasks]) => calculateRawDriverStats(name, tasks));

    const maxCompletedTasks = Math.max(0, ...rawDriverStats.map(s => s.completedTasks));

    const driverStatsList = rawDriverStats
        .map(stats => ({
            ...stats,
            score: calculateDriverScore(stats, maxCompletedTasks) ?? 0,
        }))
        .filter(stats => stats.totalRatings > 0);

    const alertAggregation: Record<string, { name: string; carriers: Record<string, { name: string; drivers: Record<string, any> }> }> = {};
    
    filteredComments.forEach(comment => {
        const task = filteredTasks.find(t => t.tacheId === comment.taskId);
        if (!task) return;

        const depot = getDepotFromHub(task.nomHub);
        if (!depot) return;

        const driverName = getDriverFullName(task);
        if (!driverName) return;

        const carrierName = getCarrierFromDriver(driverName);

        if (!alertAggregation[depot]) {
            alertAggregation[depot] = { name: depot, carriers: {} };
        }
        if (!alertAggregation[depot].carriers[carrierName]) {
            alertAggregation[depot].carriers[carrierName] = { name: carrierName, drivers: {} };
        }
        if (!alertAggregation[depot].carriers[carrierName].drivers[driverName]) {
            const driverGlobalStats = driverStatsList.find(d => d.name === driverName);
            alertAggregation[depot].carriers[carrierName].drivers[driverName] = {
                name: driverName,
                alertCount: 0,
                totalRatings: driverGlobalStats?.totalRatings || 0,
                averageRating: driverGlobalStats?.averageRating || null,
                commentCategories: {},
            };
        }

        const driverEntry = alertAggregation[depot].carriers[carrierName].drivers[driverName];
        driverEntry.alertCount++;
        driverEntry.commentCategories[comment.category] = (driverEntry.commentCategories[comment.category] || 0) + 1;
    });

    const finalAlertData: AlertData[] = Object.values(alertAggregation).map(depot => ({
        ...depot,
        carriers: Object.values(depot.carriers).map(carrier => ({
            ...carrier,
            drivers: Object.values(carrier.drivers).sort((a, b) => b.alertCount - a.alertCount),
        })).sort((a,b) => b.drivers.reduce((sum, d) => sum + d.alertCount, 0) - a.drivers.reduce((sum, d) => sum + d.alertCount, 0))
    })).sort((a,b) => b.carriers.reduce((s,c) => s + c.drivers.reduce((ss, d) => ss + d.alertCount, 0), 0) - a.carriers.reduce((s,c) => s + c.drivers.reduce((ss, d) => ss + d.alertCount, 0), 0));


    return {
      driverRankings: driverStatsList,
      alertData: finalAlertData,
    };
  }, [filteredTasks, isLoadingTasks, categorizedComments, filteredComments]);


  const isLoading = isLoadingTasks || isLoadingRounds || isLoadingComments;

  return (
    <main className="flex-1 container py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Analyse de la Qualité</h1>
        <div className="flex items-center gap-2">
           <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un livreur..." 
                className="pl-8 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
        </div>
      </div>
      <div className="space-y-8">
        <QualityDashboard data={filteredQualityData} isLoading={isLoading} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <AlertRecurrenceTable data={alertData} isLoading={isLoading} />
        <CommentAnalysis 
          data={filteredComments} 
        />
        <DriverPerformanceRankings 
            data={driverRankings || []}
            isLoading={isLoading}
        />
      </div>
    </main>
  );
}
