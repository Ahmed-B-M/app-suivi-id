
"use client";

import { useState, useMemo, useTransition } from 'react';
import { useFilters } from '@/context/filter-context';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ThumbsDown, Sparkles, Save, User, Truck, Building, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveProcessedVerbatimAction, categorizeSingleCommentAction } from '../actions';
import { ProcessedNpsVerbatim as SavedProcessedNpsVerbatim } from '@/lib/types';
import { format } from 'date-fns';
import { categories as categoryOptions } from '@/components/app/comment-analysis';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { usePendingVerbatims } from '@/hooks/use-pending-verbatims';

export type ProcessedVerbatim = Omit<SavedProcessedNpsVerbatim, 'id' | 'category' | 'responsibilities'> & { 
  id: string, 
  category: string[],
  responsibilities: string[]
};

const responsibilityOptions = ["STEF", "ID", "Carrefour", "Inconnu"];

export default function VerbatimTreatmentPage() {
  const { allProcessedVerbatims, isContextLoading } = useFilters();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'à traiter' | 'traité' | 'tous'>('à traiter');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const {
    pendingVerbatims,
    addPendingVerbatim,
    clearAllPendingVerbatims,
    isPending,
    hasPendingItems,
  } = usePendingVerbatims();

  const finalVerbatimsToDisplay = useMemo(() => {
    // 1. Normalize and merge
    const merged = allProcessedVerbatims.map(v => {
      const baseVerbatim = pendingVerbatims[v.taskId] || v;
      // **THE FIX**: Ensure category and responsibilities are always arrays
      const category = baseVerbatim.category;
      const responsibilities = baseVerbatim.responsibilities;
      
      return {
        ...baseVerbatim,
        category: Array.isArray(category) ? category : (category ? [category] : []),
        responsibilities: Array.isArray(responsibilities) ? responsibilities : (responsibilities ? [responsibilities] : []),
      };
    });

    // 2. Filter
    const filtered = statusFilter === 'tous' ? merged : merged.filter(v => v.status === statusFilter);
    return filtered;

  }, [allProcessedVerbatims, pendingVerbatims, statusFilter]);

  const handleVerbatimUpdate = (verbatim: ProcessedVerbatim, updates: Partial<ProcessedVerbatim>) => {
    const updatedVerbatim = { ...verbatim, ...updates, status: 'traité' as const };
    addPendingVerbatim(updatedVerbatim);
  };
  
  const handleSaveAll = () => {
    startSaveTransition(async () => {
      const verbatimsToSave = Object.values(pendingVerbatims);
      if (verbatimsToSave.length === 0) return;

      const results = await Promise.all(
        verbatimsToSave.map(verbatim => saveProcessedVerbatimAction(verbatim))
      );

      const failedSaves = results.filter(r => !r.success);

      if (failedSaves.length > 0) {
        toast({
          variant: "destructive",
          title: `Erreur de sauvegarde`,
          description: `${failedSaves.length} verbatim(s) n'ont pas pu être sauvegardés.`,
        });
      } else {
        toast({
          title: "Succès",
          description: `${verbatimsToSave.length} verbatim(s) ont été sauvegardés.`,
        });
        clearAllPendingVerbatims();
      }
    });
  };

  const handleSuggest = async (verbatim: ProcessedVerbatim) => {
    setAnalyzingId(verbatim.id);
    try {
      const result = await categorizeSingleCommentAction(verbatim.verbatim);
      const updates: Partial<ProcessedVerbatim> = {};
      if (result.categories) updates.category = result.categories;
      if (result.responsibilities) updates.responsibilities = result.responsibilities;

      if (Object.keys(updates).length > 0) {
        handleVerbatimUpdate(verbatim, updates);
        toast({
          title: "Suggestion de l'IA appliquée",
          description: `Les suggestions ont été mises en cache.`,
        });
      }
    } catch (error) {
      toast({
        title: "Erreur d'analyse",
        description: "Impossible d'obtenir une suggestion de l'IA.",
        variant: "destructive",
      });
    } finally {
      setAnalyzingId(null);
    }
  };


  if (isContextLoading) {
    return <div className="text-center p-8">Chargement des données...</div>;
  }

  return (
    <main className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ThumbsDown className="text-destructive"/> Traitement des Verbatims</h1>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Button variant={statusFilter === 'à traiter' ? 'destructive' : 'outline'} onClick={() => setStatusFilter('à traiter')}>À traiter</Button>
                <Button variant={statusFilter === 'traité' ? 'default' : 'outline'} onClick={() => setStatusFilter('traité')}>Traités</Button>
                <Button variant={statusFilter === 'tous' ? 'secondary' : 'outline'} onClick={() => setStatusFilter('tous')}>Tous</Button>
            </div>
             {hasPendingItems && (
                <Button onClick={handleSaveAll} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Tout Sauvegarder ({Object.keys(pendingVerbatims).length})
                </Button>
            )}
        </div>
      </div>
      
      <div className="rounded-md border">
          <Table>
              <TableHeader>
              <TableRow>
                  <TableHead>Statut</TableHead>
                  <TableHead>Détails</TableHead>
                  <TableHead className="w-[30%]">Verbatim</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-[15%]">Responsabilité</TableHead>
                  <TableHead className="w-[20%]">Catégorie</TableHead>
                  <TableHead>Action</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
              {finalVerbatimsToDisplay.map((verbatim) => (
                  <TableRow key={verbatim.id}>
                  <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={verbatim.status === 'traité' ? 'default' : 'destructive'}>{verbatim.status}</Badge>
                        {isPending(verbatim.taskId) && <Badge variant="secondary">Modifié</Badge>}
                      </div>
                  </TableCell>
                   <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-1.5 font-medium"><User className="h-3 w-3 text-muted-foreground"/>{verbatim.driver || 'N/A'}</div>
                        <div className="flex items-center gap-1.5 text-muted-foreground"><Truck className="h-3 w-3"/>{verbatim.carrier || 'N/A'}</div>
                        <div className="flex items-center gap-1.5 text-muted-foreground"><Building className="h-3 w-3"/>{verbatim.depot || verbatim.store || 'N/A'}</div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3 w-3"/>
                          {verbatim.taskDate && !isNaN(new Date(verbatim.taskDate).getTime())
                            ? format(new Date(verbatim.taskDate), 'dd/MM/yyyy')
                            : 'N/A'}
                        </div>
                      </div>
                  </TableCell>
                  <TableCell className="italic text-muted-foreground">"{verbatim.verbatim}"</TableCell>
                  <TableCell><Badge variant="destructive">{verbatim.npsScore}</Badge></TableCell>
                   <TableCell>
                      <MultiSelectCombobox
                          options={responsibilityOptions}
                          selected={verbatim.responsibilities}
                          onChange={(newSelection) => handleVerbatimUpdate(verbatim, { responsibilities: newSelection })}
                          placeholder="Sélectionner..."
                          className="w-full"
                      />
                   </TableCell>
                   <TableCell>
                      <MultiSelectCombobox
                          options={categoryOptions}
                          selected={verbatim.category}
                          onChange={(value) => handleVerbatimUpdate(verbatim, { category: value })}
                          placeholder="Sélectionner..."
                          className="w-full"
                      />
                   </TableCell>
                  <TableCell>
                     <div className="flex items-center gap-1">
                         <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleSuggest(verbatim)}
                              disabled={analyzingId === verbatim.id}
                              title="Suggérer catégories & responsabilités"
                          >
                              {analyzingId === verbatim.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4 text-primary"/>}
                          </Button>
                      </div>
                  </TableCell>
                  </TableRow>
              ))}
               {finalVerbatimsToDisplay.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">Aucun verbatim à afficher pour ce filtre.</TableCell>
                  </TableRow>
              )}
              </TableBody>
          </Table>
      </div>
    </main>
  );
}
