
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Tache } from "@/lib/types";
import { getHubCategory, getDepotFromHub, getDriverFullName } from "@/lib/grouping";
import { useFilterContext } from "@/context/filter-context";
import { QualityDashboard, type QualityData } from "@/components/app/quality-dashboard";
import { categorizeSingleCommentAction, saveCategorizedCommentsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Loader2, Save } from "lucide-react";
import { CommentAnalysis, type CategorizedComment, categories } from "@/components/app/comment-analysis";
import { useToast } from "@/hooks/use-toast";
import { addMinutes, subMinutes } from "date-fns";
import { calculateDriverScore, DriverStats } from "@/lib/scoring";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [categorizedComments, setCategorizedComments] = useState<CategorizedComment[]>([]);
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


  const qualityData = useMemo((): QualityData | null => {
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

    // 2. Calculate raw stats for each driver
    const maxCompletedTasks = Math.max(0, ...Object.values(driverTasks).map(tasks => tasks.filter(t => t.progression === 'COMPLETED').length));

    const driverStats: Record<string, ExtendedDriverStats> = {};
    Object.entries(driverTasks).forEach(([name, tasks]) => {
        const completed = tasks.filter(t => t.progression === 'COMPLETED');
        const rated = completed.map(t => t.metaDonnees?.notationLivreur).filter((r): r is number => typeof r === 'number');
        
        const completedWithTime = completed.filter(t => t.creneauHoraire?.debut && t.dateCloture);
        let punctual = 0;
        completedWithTime.forEach(t => {
            const closure = new Date(t.dateCloture!);
            const windowStart = new Date(t.creneauHoraire!.debut!);
            const windowEnd = t.creneauHoraire!.fin ? new Date(t.creneauHoraire!.fin) : addMinutes(windowStart, 120);
            if (closure >= subMinutes(windowStart, 15) && closure <= addMinutes(windowEnd, 15)) {
                punctual++;
            }
        });
        
        const rawStats = {
            name,
            totalTasks: tasks.length,
            completedTasks: completed.length,
            averageRating: rated.length > 0 ? rated.reduce((a, b) => a + b, 0) / rated.length : null,
            punctualityRate: completedWithTime.length > 0 ? (punctual / completedWithTime.length) * 100 : null,
            scanbacRate: completed.length > 0 ? (completed.filter(t => t.completePar === 'mobile').length / completed.length) * 100 : null,
            forcedAddressRate: completed.length > 0 ? (completed.filter(t => t.heureReelle?.arrivee?.adresseCorrecte === false).length / completed.length) * 100 : null,
            forcedContactlessRate: completed.length > 0 ? (completed.filter(t => t.execution?.sansContact?.forced === true).length / completed.length) * 100 : null,
        };
        driverStats[name] = {
            ...rawStats,
            score: calculateDriverScore(rawStats, maxCompletedTasks),
            tasks: tasks,
        };
    });

    // 3. Aggregate stats by depot and carrier
    const aggregated: Record<string, any> = {};

    for (const task of filteredTasks) {
        const depot = getDepotFromHub(task.nomHub);
        if (!depot) continue;

        const driverName = getDriverFullName(task);
        if (!driverName) continue;

        const carrierName = getCarrierFromDriver(driverName);
        
        // Depot level
        if (!aggregated[depot]) {
            aggregated[depot] = { name: depot, tasks: [], drivers: new Set(), carriers: {} };
        }
        // Carrier level
        if (!aggregated[depot].carriers[carrierName]) {
            aggregated[depot].carriers[carrierName] = { name: carrierName, tasks: [], drivers: new Set() };
        }

        aggregated[depot].tasks.push(task);
        aggregated[depot].drivers.add(driverName);
        aggregated[depot].carriers[carrierName].tasks.push(task);
        aggregated[depot].carriers[carrierName].drivers.add(driverName);
    }

    // 4. Calculate final averages and scores
    const details = Object.values(aggregated).map((depot: any) => {
        const avgDepotStats = calculateAverageStats(depot.tasks);

        const carriers = Object.values(depot.carriers).map((carrier: any) => {
            const avgCarrierStats = calculateAverageStats(carrier.tasks);
            const carrierDrivers = Array.from(carrier.drivers as Set<string>).map(name => driverStats[name]).filter(Boolean);
            
            return {
                name: carrier.name,
                ...avgCarrierStats,
                drivers: carrierDrivers.sort((a,b) => (b.score ?? 0) - (a.score ?? 0)),
            }
        }).sort((a, b) => b.drivers.length - a.drivers.length); // Sort by driver count as a proxy for activity
        
        return {
            name: depot.name,
            ...avgDepotStats,
            carriers,
        }
    }).sort((a, b) => b.carriers.reduce((s, c) => s + c.drivers.length, 0) - a.carriers.reduce((s, c) => s + c.drivers.length, 0));

    // --- SUMMARY CALCULATION ---
    const allDriverStats = Object.values(driverStats);
    const scoredDrivers = allDriverStats.filter(d => d.score !== undefined && d.score > 0);
    const globalAverageScore = scoredDrivers.length > 0
        ? scoredDrivers.reduce((sum, driver) => sum + (driver.score ?? 0), 0) / scoredDrivers.length
        : 0;

    const allRatedTasks = filteredTasks.map(t => t.metaDonnees?.notationLivreur).filter((r): r is number => typeof r === 'number');
    const summary = calculateAverageStats(filteredTasks);
    const totalAlerts = allRatedTasks.filter(r => r < 4).length;


    return {
      summary: {
        ...summary,
        averageRating: allRatedTasks.length > 0 ? allRatedTasks.reduce((sum, rating) => sum + rating, 0) / allRatedTasks.length : null,
        score: globalAverageScore,
        totalAlerts,
        alertRate: allRatedTasks.length > 0 ? (totalAlerts / allRatedTasks.length) * 100 : 0
      },
      details,
    };

  }, [filteredTasks, isLoadingTasks]);

  function calculateAverageStats(
    entityTasks: Tache[],
  ) {
      if (entityTasks.length === 0) {
          return { averageRating: null, punctualityRate: null, scanbacRate: null, forcedAddressRate: null, forcedContactlessRate: null, totalRatings: 0, totalAlerts: 0, alertRate: null };
      }
  
      const completedTasks = entityTasks.filter(t => t.progression === 'COMPLETED');
      const ratedTasks = completedTasks.map(t => t.metaDonnees?.notationLivreur).filter((r): r is number => typeof r === 'number');
      
      const weightedPunctuality = completedTasks.reduce((acc, task) => acc + ((task.punctualityRate ?? 0) / 100 * task.completedTasks), 0);
      const totalCompleted = completedTasks.reduce((acc, task) => acc + task.completedTasks, 0);

      const punctualityRate = totalCompleted > 0 ? (weightedPunctuality / totalCompleted) * 100 : null;

      const totalPunctualityTasks = completedTasks.map(t => t.completedTasks).reduce((sum, current) => sum + current, 0);

      const drivers = Object.values(
        entityTasks.reduce((acc, task) => {
          const driverName = getDriverFullName(task);
          if (driverName) {
            if (!acc[driverName]) acc[driverName] = { tasks: [] };
            acc[driverName].tasks.push(task);
          }
          return acc;
        }, {} as Record<string, { tasks: Tache[] }>)
      );

      const totalCompletedTasks = drivers.reduce((sum, driver) => sum + driver.tasks.filter(t => t.progression === 'COMPLETED').length, 0);
      
      const calcRate = (field: keyof Omit<DriverStats, 'name' | 'totalTasks' | 'completedTasks' | 'score' | 'averageRating'>) => {
        const weightedSum = drivers.reduce((sum, driver) => {
            const completed = driver.tasks.filter(t => t.progression === 'COMPLETED');
            if (completed.length === 0) return sum;
            
            const driverStats = calculateDriverStats(completed);
            return sum + (driverStats[field] ?? 0) * completed.length;
        }, 0);
        return totalCompletedTasks > 0 ? weightedSum / totalCompletedTasks : null;
      };
      
      const calculateDriverStats = (tasks: Tache[]) => {
          const completed = tasks.filter(t => t.progression === 'COMPLETED');
          const completedWithTime = completed.filter(t => t.creneauHoraire?.debut && t.dateCloture);
          let punctual = 0;
          completedWithTime.forEach(t => {
              const closure = new Date(t.dateCloture!);
              const windowStart = new Date(t.creneauHoraire!.debut!);
              const windowEnd = t.creneauHoraire!.fin ? new Date(t.creneauHoraire!.fin) : addMinutes(windowStart, 120);
              if (closure >= subMinutes(windowStart, 15) && closure <= addMinutes(windowEnd, 15)) {
                  punctual++;
              }
          });
          return {
              punctualityRate: completedWithTime.length > 0 ? (punctual / completedWithTime.length) * 100 : null,
              scanbacRate: completed.length > 0 ? (completed.filter(t => t.completePar === 'mobile').length / completed.length) * 100 : null,
              forcedAddressRate: completed.length > 0 ? (completed.filter(t => t.heureReelle?.arrivee?.adresseCorrecte === false).length / completed.length) * 100 : null,
              forcedContactlessRate: completed.length > 0 ? (completed.filter(t => t.execution?.sansContact?.forced === true).length / completed.length) * 100 : null,
          }
      }

      const totalRatings = ratedTasks.length;
      const totalAlerts = ratedTasks.filter(r => r < 4).length;
      
      return {
          averageRating: totalRatings > 0 ? ratedTasks.reduce((a, b) => a + b, 0) / totalRatings : null,
          punctualityRate: calcRate('punctualityRate'),
          scanbacRate: calcRate('scanbacRate'),
          forcedAddressRate: calcRate('forcedAddressRate'),
          forcedContactlessRate: calcRate('forcedContactlessRate'),
          totalRatings: totalRatings,
          totalAlerts: totalAlerts,
          alertRate: totalRatings > 0 ? (totalAlerts / totalRatings) * 100 : 0,
      };
  }

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
        <div className="flex gap-2">
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
        <QualityDashboard 
          data={qualityData} 
          isLoading={isLoading} 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <CommentAnalysis 
          data={categorizedComments} 
          onCategoryChange={handleCategoryChange} 
          onAnalyzeComment={handleAnalyzeOneComment}
        />
      </div>
    </main>
  );
}
