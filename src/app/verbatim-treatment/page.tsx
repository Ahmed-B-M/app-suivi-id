"use client";

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Loader2, ThumbsDown, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveProcessedVerbatimAction } from '../actions';
import { ProcessedNpsVerbatim, NpsVerbatim } from '@/lib/types';
import { format } from 'date-fns';
import { categories } from '@/components/app/comment-analysis';


export type ProcessedVerbatim = Omit<ProcessedNpsVerbatim, 'id'> & { id: string };

const responsibilityOptions = ["STEF", "ID", "Carrefour", "Inconnu"];

export default function VerbatimTreatmentPage() {
  const { firestore } = useFirebase();
  const { allNpsData, isContextLoading } = useFilters();
  const { toast } = useToast();

  const [editableVerbatims, setEditableVerbatims] = useState<ProcessedVerbatim[]>([]);
  const [statusFilter, setStatusFilter] = useState<'à traiter' | 'traité' | 'tous'>('à traiter');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const processedVerbatimsCollection = useMemo(() =>
    firestore ? collection(firestore, 'processed_nps_verbatims') : null,
    [firestore]
  );
  const { data: savedVerbatims = [], loading: isLoadingSaved } = useCollection<ProcessedNpsVerbatim>(processedVerbatimsCollection);

  const detractorVerbatims = useMemo(() => {
    return allNpsData.flatMap(d => d.verbatims).filter(v => v.npsCategory === 'Detractor' && v.verbatim && v.verbatim.trim() !== '');
  }, [allNpsData]);

  useEffect(() => {
    const savedVerbatimsMap = new Map(savedVerbatims.map(v => [v.taskId, v]));
    const mergedVerbatims = detractorVerbatims.map(v => {
      const saved = savedVerbatimsMap.get(v.taskId);
      return {
        id: v.taskId, // Use taskId as the unique key for the row
        taskId: v.taskId,
        npsScore: v.npsScore,
        verbatim: v.verbatim,
        responsibilities: saved?.responsibilities || [],
        category: saved?.category || 'Autre',
        status: saved?.status || 'à traiter',
        store: v.store,
        taskDate: v.taskDate,
        carrier: v.carrier,
        depot: v.depot,
        driver: v.driver,
      };
    });

    const filtered = mergedVerbatims.filter(v => statusFilter === 'tous' || v.status === statusFilter);
    setEditableVerbatims(filtered);

  }, [detractorVerbatims, savedVerbatims, statusFilter]);

  const handleResponsibilityChange = (id: string, newResponsibilities: string[]) => {
    setEditableVerbatims(prev =>
      prev.map(v => v.id === id ? { ...v, responsibilities: newResponsibilities } : v)
    );
  };

  const handleCategoryChange = (id: string, newCategory: string) => {
    setEditableVerbatims(prev =>
      prev.map(v => v.id === id ? { ...v, category: newCategory } : v)
    );
  };

  const handleSave = (verbatim: ProcessedVerbatim) => {
    setSavingId(verbatim.id);
    startTransition(async () => {
      const result = await saveProcessedVerbatimAction(verbatim);
      if (result.success) {
        toast({ title: 'Succès', description: 'Verbatim sauvegardé.' });
      } else {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
      setSavingId(null);
    });
  };

  const isLoading = isContextLoading || isLoadingSaved;

  return (
    <main className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ThumbsDown className="text-destructive"/> Traitement des Verbatims Détracteurs</h1>
        <div className="flex items-center gap-2">
            <Button
                variant={statusFilter === 'à traiter' ? 'destructive' : 'outline'}
                onClick={() => setStatusFilter('à traiter')}
            >
                À traiter
            </Button>
            <Button
                variant={statusFilter === 'traité' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('traité')}
            >
                Traités
            </Button>
             <Button
                variant={statusFilter === 'tous' ? 'secondary' : 'outline'}
                onClick={() => setStatusFilter('tous')}
            >
                Tous
            </Button>
        </div>
      </div>
      
       {isLoading && <div className="text-center p-8">Chargement des données...</div>}

       {!isLoading && (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Statut</TableHead>
                    <TableHead>Détails</TableHead>
                    <TableHead className="w-[30%]">Verbatim</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-[15%]">Responsabilité</TableHead>
                    <TableHead className="w-[15%]">Catégorie</TableHead>
                    <TableHead>Action</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {editableVerbatims.map((verbatim) => (
                    <TableRow key={verbatim.id}>
                    <TableCell>
                        <Badge variant={verbatim.status === 'traité' ? 'default' : 'destructive'}>
                        {verbatim.status}
                        </Badge>
                    </TableCell>
                     <TableCell>
                        <div className="font-medium">{verbatim.driver || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{verbatim.carrier || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{verbatim.depot || verbatim.store || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">
                            {format(new Date(verbatim.taskDate), 'dd/MM/yyyy')}
                        </div>
                    </TableCell>
                    <TableCell className="italic text-muted-foreground">"{verbatim.verbatim}"</TableCell>
                    <TableCell>
                        <Badge variant="destructive">{verbatim.npsScore}</Badge>
                    </TableCell>
                     <TableCell>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                    <span>{verbatim.responsibilities.join(', ') || 'Sélectionner'}</span>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                                {responsibilityOptions.map(option => (
                                    <DropdownMenuCheckboxItem
                                        key={option}
                                        checked={verbatim.responsibilities.includes(option)}
                                        onCheckedChange={(checked) => {
                                            const current = verbatim.responsibilities;
                                            const newResponsibilities = checked 
                                                ? [...current, option]
                                                : current.filter(r => r !== option);
                                            handleResponsibilityChange(verbatim.id, newResponsibilities);
                                        }}
                                    >
                                        {option}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                     </TableCell>
                     <TableCell>
                         <Select
                            value={verbatim.category}
                            onValueChange={(value) => handleCategoryChange(verbatim.id, value)}
                         >
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez une catégorie" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                     </TableCell>
                    <TableCell>
                        <Button onClick={() => handleSave(verbatim)} disabled={isPending && savingId === verbatim.id}>
                        {isPending && savingId === verbatim.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sauvegarder
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                 {editableVerbatims.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">Aucun verbatim à afficher pour ce filtre.</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </div>
       )}
    </main>
  );
}
