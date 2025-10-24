
"use client";

import { useState, useMemo, useTransition, useEffect, useRef } from 'react';
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
import { categories as categoryOptions } from '@/components/app/comment-analysis';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { cn } from "@/lib/utils";


export type ProcessedVerbatim = Omit<SavedProcessedNpsVerbatim, 'id' | 'category' | 'responsibilities'> & { 
  id: string, 
  category: string[],
  responsibilities: string[]
};

const responsibilityOptions = ["STEF", "ID", "Carrefour", "Inconnu"];

export default function VerbatimTreatmentPage() {
  const { allProcessedVerbatims, isContextLoading } = useFilters();
  const { toast } = useToast();

  const [editableVerbatims, setEditableVerbatims] = useState<ProcessedVerbatim[]>([]);
  const [statusFilter, setStatusFilter] = useState<'à traiter' | 'traité' | 'tous'>('à traiter');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const filtered = allProcessedVerbatims.filter(v => statusFilter === 'tous' || v.status === statusFilter);
    setEditableVerbatims(filtered);
  }, [allProcessedVerbatims, statusFilter]);

  const handleResponsibilityChange = (id: string, newResponsibilities: string[]) => {
    setEditableVerbatims(prev =>
      prev.map(v => v.id === id ? { ...v, responsibilities: newResponsibilities } : v)
    );
  };

  const handleCategoryChange = (id: string, newCategory: string[]) => {
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
        setEditableVerbatims(prev => prev.map(v => v.id === verbatim.id ? { ...v, status: 'traité' } : v));
      } else {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
      setSavingId(null);
    });
  };
  
  const handleSuggest = async (verbatim: ProcessedVerbatim) => {
    setAnalyzingId(verbatim.id);
    try {
      const result = await categorizeSingleCommentAction(verbatim.verbatim);
      
      if (result.categories) {
        handleCategoryChange(verbatim.id, result.categories);
      }
      if(result.responsibilities) {
        handleResponsibilityChange(verbatim.id, result.responsibilities);
      }

      toast({
        title: "Suggestion de l'IA",
        description: `Suggestions appliquées.`,
      });

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


  const isLoading = isContextLoading;

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
                        <MultiSelectCombobox
                            options={categoryOptions}
                            selected={verbatim.category}
                            onChange={(value) => handleCategoryChange(verbatim.id, value)}
                            placeholder="Sélectionner..."
                            className="w-full"
                        />
                     </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-1">
                          <Button onClick={() => handleSave(verbatim)} disabled={isPending && savingId === verbatim.id} size="sm">
                          {isPending && savingId === verbatim.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Sauvegarder
                          </Button>
                           <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSuggest(verbatim)}
                                disabled={analyzingId === verbatim.id}
                                title="Suggérer catégories & responsabilités"
                            >
                                {analyzingId === verbatim.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                ) : (
                                    <Sparkles className="h-4 w-4 text-primary"/>
                                )}
                            </Button>
                        </div>
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
  options: readonly string[];
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
    if (newValue && !selected.includes(newValue)) {
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
    return Array.from(combined).sort();
  }, [options, selected]);

  const filteredOptions = allOptions.filter(option => 
    !selected.includes(option) && option.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("group border border-input px-2 py-1.5 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", className)}>
          <div className="flex gap-1 flex-wrap items-center min-h-[24px]">
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
                     e.stopPropagation();
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
                    className="bg-transparent outline-none placeholder:text-muted-foreground w-full text-sm"
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
                {inputValue && (
                    <CommandItem onSelect={() => handleCreate(inputValue)}>
                        Créer "{inputValue}"
                    </CommandItem>
                )}
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

    