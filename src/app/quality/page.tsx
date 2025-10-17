
"use client";

import { useMemo, useState } from "react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Tache, Tournee } from "@/lib/types";
import { getHubCategory, getDepotFromHub, getDriverFullName } from "@/lib/grouping";
import { useFilterContext } from "@/context/filter-context";
import { QualityDashboard, type QualityData } from "@/components/app/quality-dashboard";
import { categorizeCommentsAction, saveCategorizedCommentsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Loader2, Save } from "lucide-react";
import { CommentAnalysis, type CategorizedComment } from "@/components/app/comment-analysis";
import { useToast } from "@/hooks/use-toast";

export default function QualityPage() {
  const { firestore } = useFirebase();
  const { dateRange, filterType, selectedDepot, selectedStore } = useFilterContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CategorizedComment[] | null>(null);
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


  const qualityData = useMemo((): QualityData | null => {
    if (!filteredTasks) return null;

    const ratedTasks = filteredTasks.filter(t => typeof t.metaDonnees?.notationLivreur === 'number');

    const aggregated: Record<string, any> = {};

    for (const task of ratedTasks) {
      const depot = getDepotFromHub(task.nomHub);
      if (!depot) continue;

      const driverName = getDriverFullName(task) || "Inconnu";
      const carrier = getCarrierFromDriver(driverName);
      const driverId = task.livreur?.idExterne || driverName;
      const rating = task.metaDonnees!.notationLivreur!;
      const isAlert = rating < 4;
      const comment = task.metaDonnees!.commentaireLivreur;

      // Depot level
      if (!aggregated[depot]) {
        aggregated[depot] = { name: depot, totalRatings: 0, totalAlerts: 0, sumRatings: 0, carriers: {} };
      }
      aggregated[depot].totalRatings++;
      aggregated[depot].sumRatings += rating;
      if (isAlert) aggregated[depot].totalAlerts++;

      // Carrier level
      if (!aggregated[depot].carriers[carrier]) {
        aggregated[depot].carriers[carrier] = { name: carrier, totalRatings: 0, totalAlerts: 0, sumRatings: 0, drivers: {} };
      }
      aggregated[depot].carriers[carrier].totalRatings++;
      aggregated[depot].carriers[carrier].sumRatings += rating;
      if (isAlert) aggregated[depot].carriers[carrier].totalAlerts++;

      // Driver level
      if (!aggregated[depot].carriers[carrier].drivers[driverId]) {
        aggregated[depot].carriers[carrier].drivers[driverId] = { name: driverName, totalRatings: 0, totalAlerts: 0, sumRatings: 0, ratings: [] };
      }
      const driver = aggregated[depot].carriers[carrier].drivers[driverId];
      driver.totalRatings++;
      driver.sumRatings += rating;
      if (isAlert) driver.totalAlerts++;
      driver.ratings.push({
        rating,
        comment: comment || null,
        date: task.date,
        taskId: task.tacheId,
      });
    }

    const details = Object.values(aggregated).map((depot: any) => ({
      ...depot,
      avgRating: depot.totalRatings > 0 ? depot.sumRatings / depot.totalRatings : 0,
      carriers: Object.values(depot.carriers).map((carrier: any) => ({
        ...carrier,
        avgRating: carrier.totalRatings > 0 ? carrier.sumRatings / carrier.totalRatings : 0,
        drivers: Object.values(carrier.drivers).map((driver: any) => ({
          ...driver,
          avgRating: driver.totalRatings > 0 ? driver.sumRatings / driver.totalRatings : 0,
        })).sort((a: any, b: any) => b.avgRating - a.avgRating),
      })).sort((a: any, b: any) => b.avgRating - a.avgRating),
    })).sort((a,b) => b.avgRating - a.avgRating);
    
    const totalRatings = details.reduce((sum, d) => sum + d.totalRatings, 0);
    const totalAlerts = details.reduce((sum, d) => sum + d.totalAlerts, 0);
    const sumRatings = details.reduce((sum, d) => sum + d.sumRatings, 0);


    return {
      summary: {
        totalRatings,
        totalAlerts,
        avgRating: totalRatings > 0 ? sumRatings / totalRatings : 0,
        alertRate: totalRatings > 0 ? (totalAlerts / totalRatings) * 100 : 0,
      },
      details,
    };
  }, [filteredTasks]);

  const tasksToAnalyze = useMemo(() => {
    return filteredTasks.filter(task =>
      typeof task.metaDonnees?.notationLivreur === 'number' &&
      task.metaDonnees.notationLivreur < 4 &&
      task.metaDonnees.commentaireLivreur
    );
  }, [filteredTasks]);

  const handleAnalyzeComments = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    toast({
      title: "Analyse en cours...",
      description: `Analyse de ${tasksToAnalyze.length} commentaires. Cela peut prendre quelques instants.`,
    });

    const result = await categorizeCommentsAction(tasksToAnalyze);
    setIsAnalyzing(false);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Erreur d'analyse",
        description: result.error,
      });
    } else {
      setAnalysisResult(result.data);
       toast({
        title: "Analyse terminée !",
        description: `${result.data?.length} commentaires ont été classés avec succès.`,
      });
    }
  };

  const handleSave = async () => {
    if (!analysisResult) return;
    setIsSaving(true);
    toast({
      title: "Sauvegarde en cours...",
      description: `Sauvegarde de ${analysisResult.length} catégories dans la base de données.`
    });

    const commentsToSave = analysisResult.map(item => ({
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
    setAnalysisResult(prev => 
      prev!.map(item => 
        item.task.tacheId === taskId ? { ...item, category: newCategory } : item
      )
    );
  };


  const isLoading = isLoadingTasks || isLoadingRounds;

  return (
    <main className="flex-1 container py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Analyse de la Qualité</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleAnalyzeComments}
            disabled={isAnalyzing || tasksToAnalyze.length === 0}
          >
            {isAnalyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BrainCircuit className="mr-2 h-4 w-4" />
            )}
            Analyser les Commentaires ({tasksToAnalyze.length})
          </Button>
          {analysisResult && (
             <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Sauvegarder les Catégories
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
        {analysisResult && <CommentAnalysis data={analysisResult} onCategoryChange={handleCategoryChange} />}
      </div>
    </main>
  );
}

    