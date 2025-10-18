
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Tache, Tournee } from "@/lib/types";
import { getHubCategory, getDepotFromHub, getDriverFullName, getCarrierFromDriver } from "@/lib/grouping";
import { useFilterContext } from "@/context/filter-context";
import { categorizeSingleCommentAction, saveCategorizedCommentsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Search } from "lucide-react";
import { CommentAnalysis, type CategorizedComment, categories } from "@/components/app/comment-analysis";
import { useToast } from "@/hooks/use-toast";
import { calculateDriverScore, calculateRawDriverStats, DriverStats } from "@/lib/scoring";
import { DriverPerformanceRankings } from "@/components/app/driver-performance-rankings";
import { AlertRecurrenceTable, type AlertData } from "@/components/app/alert-recurrence-table";
import { QualityDashboard, QualityData } from "@/components/app/quality-dashboard";
import { Input } from "@/components/ui/input";


interface ExtendedDriverStats extends DriverStats {
  tasks: Tache[];
}

const keywordCategories: Record<typeof categories[number], string[]> = {
  'Attitude livreur': ['agressif', 'impoli', 'pas aimable', 'désagréable'],
  'Amabilité livreur': ['souriant', 'courtois', 'aimable', 'gentil', 'professionnel'], // also positive for context
  'Casse produit': ['casse', 'cassé', 'abimé', 'endommagé', 'produit abîmé'],
  'Manquant produit': ['manquant', 'manque', 'oubli', 'pas reçu', 'produit manquant'],
  'Manquant multiple': ['plusieurs manquants', 'nombreux oublis'],
  'Manquant bac': ['bac manquant', 'caisse manquante'],
  'Non livré': ['non livré', 'pas livré', 'jamais reçu'],
  'Erreur de préparation': ['erreur prepa', 'mauvais produit', 'erreur de commande'],
  'Erreur de livraison': ['mauvaise adresse', 'erreur livraison', 'pas le bon client'],
  'Livraison en avance': ['en avance', 'trop tôt'],
  'Livraison en retard': ['en retard', 'trop tard', 'attente'],
  'Rupture chaine de froid': ['chaîne du froid', 'produits chauds', 'pas frais'],
  'Process': ['processus', 'application', 'site web', 'service client'],
  'Non pertinent': ['test', 'ras', 'ok', 'rien a signaler'],
  'Autre': [],
};

const getCategoryFromKeywords = (comment: string): typeof categories[number] => {
    const lowerCaseComment = comment.toLowerCase();
    for (const [category, keywords] of Object.entries(keywordCategories)) {
        if (keywords.some(keyword => lowerCaseComment.includes(keyword))) {
            return category as typeof categories[number];
        }
    }
    return 'Autre';
}


export default function QualityPage() {
  const { firestore } = useFirebase();
  const { dateRange, filterType, selectedDepot, selectedStore } = useFilterContext();
  const [isSaving, setIsSaving] = useState(false);
  const [categorizedComments, setCategorizedComments] = useState<CategorizedComment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

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


   useEffect(() => {
    const commentsToCategorize = filteredTasks.filter(task =>
      typeof task.metaDonnees?.notationLivreur === 'number' &&
      task.metaDonnees.notationLivreur < 4 &&
      task.metaDonnees.commentaireLivreur
    );

    const initialCategorization = commentsToCategorize.map(task => ({
      task: task,
      category: getCategoryFromKeywords(task.metaDonnees!.commentaireLivreur!),
      isAnalyzing: false,
    }));

    setCategorizedComments(initialCategorization);

  }, [filteredTasks]);

  const qualityData = useMemo(() => {
    if (!filteredTasks || isLoadingTasks) return null;

    // 1. Group tasks by driver
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

    const driverStatsList: DriverStats[] = rawDriverStats
        .map(rawStats => ({
            ...rawStats,
            score: calculateDriverScore(rawStats, maxCompletedTasks),
        }));

    // 3. Aggregate stats by depot and carrier
    const depotAggregation: Record<string, { name: string; carriers: Record<string, { name: string; drivers: DriverStats[] }> }> = {};

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

    const calculateAggregatedStats = (drivers: DriverStats[]) => {
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
    if (!filteredTasks || isLoadingTasks) return { driverRankings: null, alertData: [] };

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

    const driverStatsList: DriverStats[] = rawDriverStats
        .map(stats => ({
            ...stats,
            score: calculateDriverScore(stats, maxCompletedTasks),
        }))
        .filter(stats => stats.totalRatings > 0);

    const alertAggregation: Record<string, { name: string; carriers: Record<string, { name: string; drivers: Record<string, any> }> }> = {};

    const alertTasks = filteredTasks.filter(t => typeof t.metaDonnees?.notationLivreur === 'number' && t.metaDonnees.notationLivreur < 4);

    alertTasks.forEach(task => {
        const depot = getDepotFromHub(task.nomHub);
        if (!depot) return;

        const driverName = getDriverFullName(task);
        if (!driverName) return;

        const carrierName = getCarrierFromDriver(driverName);
        const comment = task.metaDonnees?.commentaireLivreur || '';
        const category = getCategoryFromKeywords(comment);

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
        driverEntry.commentCategories[category] = (driverEntry.commentCategories[category] || 0) + 1;
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
  }, [filteredTasks, isLoadingTasks]);


  const handleAnalyzeOneComment = useCallback(async (taskId: string) => {
    const commentToAnalyze = categorizedComments.find(c => c.task.tacheId === taskId);
    if (!commentToAnalyze || !commentToAnalyze.task.metaDonnees?.commentaireLivreur) return;

    setCategorizedComments(prev =>
      prev.map(c => c.task.tacheId === taskId ? { ...c, isAnalyzing: true } : c)
    );

    const result = await categorizeSingleCommentAction(commentToAnalyze.task.metaDonnees.commentaireLivreur);

    setCategorizedComments(prev =>
      prev.map(c => c.task.tacheId === taskId ? { ...c, category: result.category, isAnalyzing: false } : c)
    );
  }, [categorizedComments]);


  const handleSave = async () => {
    if (categorizedComments.length === 0) return;
    setIsSaving(true);
    toast({
      title: "Sauvegarde en cours...",
      description: `Sauvegarde de ${categorizedComments.length} catégories dans la base de données.`
    });

    const commentsToSave = categorizedComments.map(item => ({
      taskId: item.task.tacheId,
      comment: item.task.metaDonnees?.commentaireLivreur || "",
      rating: item.task.metaDonnees?.notationLivreur || 0,
      category: item.category,
      taskDate: item.task.date,
      driverName: getDriverFullName(item.task),
    }));

    const result = await saveCategorizedCommentsAction(commentsToSave);
    setIsSaving(false);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Erreur de sauvegarde",
        description: result.error,
      });
    } else {
      toast({
        title: "Sauvegarde réussie !",
        description: "Les catégories ont été enregistrées dans la base de données.",
      });
    }
  };

  const handleCategoryChange = (taskId: string, newCategory: string) => {
    setCategorizedComments(prev => 
      prev!.map(item => 
        item.task.tacheId === taskId ? { ...item, category: newCategory as (typeof item.category) } : item
      )
    );
  };


  const isLoading = isLoadingTasks || isLoadingRounds;

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
          {categorizedComments.length > 0 && (
             <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Sauvegarder les Catégories ({categorizedComments.length})
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-8">
        <QualityDashboard data={filteredQualityData} isLoading={isLoading} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <AlertRecurrenceTable data={alertData} isLoading={isLoading} />
        <CommentAnalysis 
          data={categorizedComments} 
          onCategoryChange={handleCategoryChange} 
          onAnalyzeComment={handleAnalyzeOneComment}
        />
        <DriverPerformanceRankings 
            data={driverRankings || []}
            isLoading={isLoading}
        />
      </div>
    </main>
  );
}
