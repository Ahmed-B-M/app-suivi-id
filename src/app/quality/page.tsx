
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import type { Tache } from "@/lib/types";
import { useFilterContext } from "@/context/filter-context";
import { categorizeSingleCommentAction, saveCategorizedCommentsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Search } from "lucide-react";
import { CommentAnalysis, type CategorizedComment } from "@/components/app/comment-analysis";
import { useToast } from "@/hooks/use-toast";
import { DriverPerformanceRankings } from "@/components/app/driver-performance-rankings";
import { AlertRecurrenceTable } from "@/components/app/alert-recurrence-table";
import { QualityDashboard } from "@/components/app/quality-dashboard";
import { Input } from "@/components/ui/input";
import { calculateQualityStats, getCategoryFromKeywords } from "@/lib/stats-calculator";

export default function QualityPage() {
  const { filteredTasks, isLoading } = useFilterContext();
  const [isSaving, setIsSaving] = useState(false);
  const [categorizedComments, setCategorizedComments] = useState<CategorizedComment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

   useEffect(() => {
    const commentsToCategorize = filteredTasks.filter(task =>
      typeof task.metaDonnees?.notationLivreur === 'number' &&
      task.metaDonnees.notationLivreur < 4 &&
      task.metaDonnees.commentaireLivreur
    );

    const initialCategorization = commentsToCategorize.map(task => ({
      task: task,
      category: getCategoryFromKeywords(task.metaDonnees!.commentaireLivreur),
      isAnalyzing: false,
    }));

    setCategorizedComments(initialCategorization);

  }, [filteredTasks]);

  const qualityData = useMemo(() => {
    if (!filteredTasks || isLoading) return null;
    return calculateQualityStats(filteredTasks);
  }, [filteredTasks, isLoading]);


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
    if (!qualityData) return { driverRankings: null, alertData: [] };
    return {
      driverRankings: qualityData.driverRankings,
      alertData: qualityData.alertData,
    };
  }, [qualityData]);


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
      driverName: (item.task.livreur?.prenom || "") + " " + (item.task.livreur?.nom || ""),
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
