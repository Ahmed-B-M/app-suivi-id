
"use client";

import { useState, useEffect, useMemo, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateSingleCommentAction, categorizeSingleCommentAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useFilters } from "@/context/filter-context";
import { Loader2, Sparkles, Check, ChevronsUpDown, X } from "lucide-react";
import type { CategorizedComment } from "@/hooks/use-pending-comments";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { categories as categoryOptions } from "@/components/app/comment-analysis";


export default function CommentManagementPage() {
  const { allComments, isContextLoading } = useFilters();
  const [statusFilter, setStatusFilter] = useState<'tous' | 'à traiter' | 'traité'>('à traiter');
  
  const [editableComments, setEditableComments] = useState<
    CategorizedComment[]
  >([]);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const filteredComments = useMemo(() => {
    let commentsToFilter = allComments;
    
    if (statusFilter !== 'tous') {
      commentsToFilter = commentsToFilter.filter(comment => comment.status === statusFilter);
    }
    
    return commentsToFilter.sort((a, b) => {
        const dateA = a.taskDate ? new Date(a.taskDate as string).getTime() : 0;
        const dateB = b.taskDate ? new Date(b.taskDate as string).getTime() : 0;
        return dateB - dateA;
    });

  }, [allComments, statusFilter]);

  useEffect(() => {
    setEditableComments(filteredComments.map(c => ({
      ...c,
      category: Array.isArray(c.category) ? c.category : (c.category ? [c.category] : [])
    })));
  }, [filteredComments]);


  const handleCategoryChange = (id: string, value: string[]) => {
    setEditableComments((prev) =>
      prev.map((comment) =>
        comment.id === id ? { ...comment, category: value } : comment
      )
    );
  };

  const handleSave = (comment: CategorizedComment) => {
    setSavingId(comment.id);
    startTransition(async () => {
      // Create a plain object for the server action
      const commentToSave = {
        taskId: comment.taskId,
        comment: comment.comment,
        rating: comment.rating,
        category: comment.category,
        taskDate: comment.taskDate ? new Date(comment.taskDate as string).toISOString() : undefined,
        driverName: comment.driverName,
      };

      const result = await updateSingleCommentAction(commentToSave);
      if (result.success) {
        toast({
          title: "Succès",
          description: "Le commentaire a été sauvegardé.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erreur de sauvegarde",
          description: result.error,
        });
      }
      setSavingId(null);
    });
  };
  
  const handleSuggestCategory = async (comment: CategorizedComment) => {
    setAnalyzingId(comment.id);
    try {
      const result = await categorizeSingleCommentAction(comment.comment);
      if (result.categories) {
         handleCategoryChange(comment.id, result.categories);
        toast({
          title: "Suggestion de l'IA",
          description: `Catégories suggérées : "${result.categories.join(', ')}".`,
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


  const isLoading = isContextLoading;
  
  if (isLoading) {
    return <div className="container mx-auto py-10 text-center">Chargement...</div>;
  }

  return (
    <div className="container mx-auto py-10">
       <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestion des Commentaires</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === 'à traiter' ? 'default' : 'outline'}
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
            variant={statusFilter === 'tous' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('tous')}
          >
            Tous
          </Button>
        </div>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Statut</TableHead>
              <TableHead>Task ID</TableHead>
              <TableHead className="w-[40%]">Commentaire</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Chauffeur</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editableComments.length > 0 ? (
              editableComments.map((comment) => (
                <TableRow key={comment.id}>
                  <TableCell>
                    <Badge
                      variant={
                        comment.status === "traité" ? "default" : "destructive"
                      }
                    >
                      {comment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{comment.taskId}</TableCell>
                  <TableCell>
                    <p className="whitespace-pre-wrap">{comment.comment}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={comment.rating < 4 ? "destructive" : "default"}>
                      {comment.rating} / 5
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MultiSelectCombobox
                        options={categoryOptions}
                        selected={comment.category}
                        onChange={(value) => handleCategoryChange(comment.id, value)}
                        placeholder="Sélectionner catégories..."
                        className="min-w-[250px]"
                      />
                       <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSuggestCategory(comment)}
                          disabled={analyzingId === comment.id}
                          title="Suggérer une catégorie"
                      >
                          {analyzingId === comment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin"/>
                          ) : (
                              <Sparkles className="h-4 w-4 text-primary"/>
                          )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{comment.taskDate ? new Date(comment.taskDate as string).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>{comment.driverName}</TableCell>
                  <TableCell>
                    <Button onClick={() => handleSave(comment)} disabled={isPending && savingId === comment.id}>
                       {isPending && savingId === comment.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sauvegarder
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                        Aucun commentaire à afficher pour ce filtre.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
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
    return Array.from(combined);
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

