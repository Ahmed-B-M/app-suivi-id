
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface InlineMultiSelectProps {
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export function InlineMultiSelect({
  options,
  selected,
  onChange,
  className,
}: InlineMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleSelect = (option: string) => {
    if (!selected.includes(option)) {
      onChange([...selected, option]);
    }
    setInputValue("");
    setOpen(false);
  };
  
  const handleRemove = (option: string) => {
      const newSelected = selected.filter((item) => item !== option);
      onChange(newSelected);
  }

  const handleCreate = (newValue: string) => {
    if (newValue && !options.includes(newValue) && !selected.includes(newValue)) {
      onChange([...selected, newValue]);
    }
    setInputValue("");
    setOpen(false);
  };

  const availableOptions = React.useMemo(() => {
    const combined = new Set([...options, ...selected]);
    return Array.from(combined).sort().filter(opt => !selected.includes(opt));
  }, [options, selected]);

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {selected.map((item) => (
        <Badge
          key={item}
          variant="secondary"
          className="rounded-sm font-normal"
        >
          {item}
          <button
            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove(item);
            }}
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        </Badge>
      ))}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
            <PlusCircle className="h-4 w-4" />
            <span className="sr-only">Ajouter</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Rechercher..."
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputValue) {
                  e.preventDefault();
                  handleCreate(inputValue);
                }
              }}
            />
            <CommandList>
              <CommandEmpty>
                {inputValue ? (
                  <CommandItem onSelect={() => handleCreate(inputValue)}>
                    Créer "{inputValue}"
                  </CommandItem>
                ) : (
                  "Aucun résultat."
                )}
              </CommandEmpty>
              <CommandGroup>
                {availableOptions.map((option) => (
                  <CommandItem
                    key={option}
                    onSelect={() => handleSelect(option)}
                  >
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
