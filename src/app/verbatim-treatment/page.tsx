
"use client";

import { useState, useMemo, useTransition, useEffect, useRef } from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, ThumbsDown, ChevronDown, Sparkles, X, Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveProcessedVerbatimAction, categorizeSingleCommentAction } from '../actions';
import { ProcessedNpsVerbatim as SavedProcessedNpsVerbatim } from '@/lib/types';
import { format } from 'date-fns';
import { categories } from '@/components/app/comment-analysis';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { cn } from "@/lib/utils";


export type ProcessedVerbatim = Omit<SavedProcessedNpsVerbatim, 'id'> & { id: string };

const responsibilityOptions = ["STEF", "ID", "Carrefour", "Inconnu"];

export default function VerbatimTreatmentPage() {
  const { firestore } = useFirebase();
  const { allNpsData, isContextLoading } = useFilters();
  const { toast } = useToast();

  const [editableVerbatims, setEditableVerbatims] = useState<ProcessedVerbatim[]>([]);
  const [statusFilter, setStatusFilter] = useState<'à traiter' | 'traité' | 'tous'>('à traiter');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const processedVerbatimsCollection = useMemo(() =>
    firestore ? collection(firestore, 'processed_nps_verbatims') : null,
    [firestore]
  );
  const { data: savedVerbatims = [], loading: isLoadingSaved } = useCollection<SavedProcessedNpsVerbatim>(processedVerbatimsCollection);

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
        // Optimistically update the status in the UI
        setEditableVerbatims(prev => prev.map(v => v.id === verbatim.id ? { ...v, status: 'traité' } : v));
      } else {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
      setSavingId(null);
    });
  };
  
  const handleSuggestCategory = async (verbatim: ProcessedVerbatim) => {
    setAnalyzingId(verbatim.id);
    try {
      const result = await categorizeSingleCommentAction(verbatim.verbatim);
      if (result.category) {
        handleCategoryChange(verbatim.id, result.category);
        toast({
          title: "Suggestion de l'IA",
          description: `Catégorie suggérée : "${result.category}".`,
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
                    <TableHead className="w-[20%]">Catégorie</TableHead>
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
                        <MultiSelectCombobox
                            options={responsibilityOptions}
                            selected={verbatim.responsibilities}
                            onChange={(newSelection) => handleResponsibilityChange(verbatim.id, newSelection)}
                            placeholder="Sélectionner..."
                            className="w-full"
                        />
                     </TableCell>
                     <TableCell>
                        <div className="flex items-center gap-1">
                             <CategoryCombobox
                                value={verbatim.category}
                                onChange={(value) => handleCategoryChange(verbatim.id, value)}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSuggestCategory(verbatim)}
                                disabled={analyzingId === verbatim.id}
                                title="Suggérer une catégorie"
                            >
                                {analyzingId === verbatim.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                ) : (
                                    <Sparkles className="h-4 w-4 text-primary"/>
                                )}
                            </Button>
                        </div>
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


interface MultiSelectComboboxProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  placeholder?: string;
}

function MultiSelectCombobox({ options, selected, onChange, className, placeholder = "Select options" }: MultiSelectComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };
  
  const handleCreate = (newValue: string) => {
    if (newValue && !selected.includes(newValue)) { // No need to check if it's in options
      onChange([...selected, newValue]);
    }
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue) {
      e.preventDefault();
      handleCreate(inputValue);
    }
  };

  const allOptions = useMemo(() => {
    const combined = new Set([...options, ...selected]);
    return Array.from(combined);
  }, [options, selected]);

  const filteredOptions = allOptions.filter(option => 
    !selected.includes(option) && option.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", className)}>
          <div className="flex gap-1 flex-wrap">
            {selected.map(item => (
              <Badge
                key={item}
                variant="secondary"
                className="rounded-sm"
              >
                {item}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onClick={(e) => {
                     e.preventDefault();
                     handleSelect(item);
                  }}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            ))}
             <div className="flex-1 min-w-[60px]">
                <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={selected.length > 0 ? '' : placeholder}
                    className="bg-transparent outline-none placeholder:text-muted-foreground w-full"
                    onClick={() => setOpen(true)}
                />
            </div>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
           filter={(value, search) => {
                if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                return 0;
            }}
        >
           <CommandInput 
                ref={inputRef}
                placeholder="Rechercher ou créer..."
                value={inputValue}
                onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
                <CommandItem onSelect={() => handleCreate(inputValue)}>
                    Créer "{inputValue}"
                </CommandItem>
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map(option => (
                <CommandItem
                  key={option}
                  onSelect={() => handleSelect(option)}
                >
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
             {selected.length > 0 && (
                <>
                <CommandSeparator />
                <CommandGroup>
                    <CommandItem onSelect={() => onChange([])} className="text-center justify-center text-destructive">
                        Effacer la sélection
                    </CommandItem>
                </CommandGroup>
                </>
             )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CategoryCombobox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // Update internal input value when the external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSelect = (currentValue: string) => {
    const newValue = currentValue === value ? "" : currentValue;
    onChange(newValue);
    setInputValue(newValue);
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{value || "Sélectionner..."}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
            filter={(value, search) => {
                if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                return 0;
            }}
        >
          <CommandInput 
            placeholder="Rechercher ou créer..."
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => {
                // On blur, if the inputValue is not in the options, we still want to set it.
                onChange(inputValue);
            }}
          />
          <CommandList>
             <CommandEmpty>
                <CommandItem
                    onSelect={() => {
                       onChange(inputValue);
                       setOpen(false);
                    }}
                >
                    Créer "{inputValue}"
                </CommandItem>
            </CommandEmpty>
            <CommandGroup>
              {categories.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
