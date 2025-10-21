
"use client";

import { useMemo, useState, useEffect } from "react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Tache, Tournee } from "@/lib/types";
import { getHubCategory, getDepotFromHub, getDriverFullName, getCarrierFromDriver } from "@/lib/grouping";
import { useFilters } from "@/context/filter-context";
import { CommentAnalysis, type CategorizedComment } from "@/components/app/comment-analysis";
import { calculateDriverScore, calculateRawDriverStats, DriverStats } from "@/lib/scoring";
import { DriverPerformanceRankings } from "@/components/app/driver-performance-rankings";
import { AlertRecurrenceTable, type AlertData } from "@/components/app/alert-recurrence-table";
import { QualityDashboard, QualityData } from "@/components/app/quality-dashboard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { categorizeComment, updateSingleCommentAction, saveCategorizedCommentsAction } from "@/app/actions";
import { Cloud, CloudOff, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCategoryFromKeywords } from "@/lib/stats-calculator";

interface LocalCategorizedComment extends CategorizedComment {
  isSaved: boolean;
}

export default function QualityPage() {
  const { firestore } = useFirebase();
  const { dateRange, allTasks, isContextLoading } = useFilters();
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const commentsCollection = useMemoFirebase(() => {
      if (!firestore) return null;
      return collection(firestore, 'categorized_comments');
  }, [firestore]);

  const { data: savedCommentsData, isLoading: isLoadingComments } = useCollection<CategorizedComment>(commentsCollection);
  
  const [categorizedComments, setCategorizedComments] = useState<LocalCategorizedComment[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const savedCommentIds = useMemo(() => new Set(savedCommentsData?.map(c => c.taskId) || []), [savedCommentsData]);

  useEffect(() => {
    if (!allTasks || !savedCommentsData) return;

    const savedCommentsMap = new Map(savedCommentsData.map(c => [c.taskId, c]));

    const allComments = allTasks
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
                    isSaved: true
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
                    isSaved: false
                };
            }
        });

      setCategorizedComments(allComments);

  }, [allTasks, savedCommentsData]);


  const handleCategoryChange = (taskId: string, newCategory: string) => {
    setCategorizedComments(prev =>
      prev.map(c => (c.taskId === taskId ? { ...c, category: newCategory, isSaved: false } : c))
    );
  };
  
  const handleSaveSingleComment = async (commentToSave: LocalCategorizedComment) => {
    setIsSaving(true);
    const result = await updateSingleCommentAction(commentToSave);
    if (result.success) {
      toast({ title: "Succès", description: `Commentaire ${commentToSave.taskId} sauvegardé.` });
      setCategorizedComments(prev => prev.map(c => c.taskId === commentToSave.taskId ? {...c, isSaved: true, status: 'traité'} : c));
    } else {
      toast({ title: "Erreur", description: result.error, variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleSaveAllUnsaved = async () => {
      const unsaved = categorizedComments.filter(c => !c.isSaved);
      if (unsaved.length === 0) {
          toast({ title: "Information", description: "Tous les commentaires sont déjà sauvegardés."});
          return;
      }
      setIsSaving(true);
      const result = await saveCategorizedCommentsAction(unsaved);
       if (result.success) {
            toast({ title: "Succès", description: `${unsaved.length} commentaires ont été sauvegardés.` });
             setCategorizedComments(prev => prev.map(c => unsaved.find(u => u.taskId === c.taskId) ? {...c, isSaved: true, status: 'traité'} : c));
        } else {
            toast({ title: "Erreur", description: result.error, variant: "destructive" });
        }
      setIsSaving(false);
  }

  const qualityData = useMemo(() => {
    if (!allTasks || isContextLoading) return null;

    let filteredTasks = allTasks;
    
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
        if (!depotName) return;

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
      const completedTasks = drivers.reduce((sum, d) => sum + (d.completedTasks || 0), 0);
      
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
      
      return {
        totalRatings,
        averageRating,
        punctualityRate: weightedAvg('punctualityRate', 'completedTasks'),
        scanbacRate: weightedAvg('scanbacRate', 'completedTasks'),
        forcedAddressRate: weightedAvg('forcedAddressRate', 'completedTasks'),
        forcedContactlessRate: weightedAvg('forcedContactlessRate', 'completedTasks'),
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
            })).sort((a,b) => (b.drivers.reduce((s,d) => s + (d.score ?? 0), 0) / b.drivers.length) - (a.drivers.reduce((s,d) => s + (d.score ?? 0), 0) / a.drivers.length))
        };
    }).sort((a,b) => (b.carriers.reduce((s,c) => s + c.drivers.reduce((ss, d) => ss + (d.score ?? 0), 0), 0) / b.carriers.flatMap(c => c.drivers).length) - (a.carriers.reduce((s,c) => s + c.drivers.reduce((ss, d) => ss + (d.score ?? 0), 0), 0) / a.carriers.flatMap(c => c.drivers).length));

    const summary = calculateAggregatedStats(driverStatsList);

    return { summary, details };
  }, [allTasks, isContextLoading, dateRange]);


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
    if (!allTasks || isContextLoading || !savedCommentsData) return { driverRankings: null, alertData: [] };
    
    const commentsMap = new Map(savedCommentsData.map(c => [c.taskId, c]));
    
    const allNegativeComments = allTasks
        .filter(task => 
            typeof task.metaDonnees?.notationLivreur === 'number' &&
            task.metaDonnees.notationLivreur < 4 &&
            task.metaDonnees.commentaireLivreur
        )
        .map(task => {
            const savedComment = commentsMap.get(task.tacheId);
            return {
                taskId: task.tacheId,
                comment: task.metaDonnees!.commentaireLivreur!,
                rating: task.metaDonnees!.notationLivreur!,
                category: savedComment?.category || getCategoryFromKeywords(task.metaDonnees!.commentaireLivreur!),
                taskDate: task.date,
                driverName: getDriverFullName(task),
                nomHub: task.nomHub,
            };
        });
    
    const driverTasks: Record<string, Tache[]> = {};
    allTasks.forEach(task => {
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
    
    allNegativeComments.forEach(comment => {
        const depot = getDepotFromHub(comment.nomHub);
        if (!depot) return;

        const driverName = comment.driverName;
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
        carriers: Object.values(depot.carriers)
            .map(carrier => ({
                ...carrier,
                drivers: Object.values(carrier.drivers).sort((a, b) => b.alertCount - a.alertCount),
            }))
            .sort((a,b) => (b.drivers.reduce((sum, d) => sum + d.alertCount, 0)) - (a.drivers.reduce((sum, d) => sum + d.alertCount, 0)))
    })).sort((a,b) => {
        const totalA = a.carriers?.reduce((s,c) => s + c.drivers.reduce((ss, d) => ss + d.alertCount, 0), 0) || 0;
        const totalB = b.carriers?.reduce((s,c) => s + c.drivers.reduce((ss, d) => ss + d.alertCount, 0), 0) || 0;
        return totalB - totalA;
    });

    return {
      driverRankings: driverStatsList,
      alertData: finalAlertData,
    };
  }, [allTasks, isContextLoading, savedCommentsData]);


  const isLoading = isContextLoading || isLoadingComments;

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
            data={categorizedComments}
        />
        <DriverPerformanceRankings 
            data={driverRankings || []}
            isLoading={isLoading}
        />
      </div>
    </main>
  );
}
