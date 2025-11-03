
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

import { Check, X, ChevronsUpDown } from "lucide-react";
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

interface MultiSelectComboboxProps {
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  placeholder?: string;
}

export function MultiSelectCombobox({
  options,
  selected,
  onChange,
  className,
  placeholder = "Sélectionner...",
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleSelect = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  const handleCreate = (newValue: string) => {
    if (newValue && !options.includes(newValue) && !selected.includes(newValue)) {
      onChange([...selected, newValue]);
    }
    setInputValue("");
  };

  const allOptions = React.useMemo(() => {
    const combined = new Set([...options, ...selected]);
    return Array.from(combined).sort();
  }, [options, selected]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto min-h-[40px]", className)}
          onClick={() => setOpen(!open)}
        >
          <div className="flex gap-1 flex-wrap items-center">
            {selected.length > 0 ? (
              <>
                <Badge variant="secondary">{selected.length}</Badge>
                <span className="text-muted-foreground text-sm">sélectionné(s)</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder="Rechercher ou créer..."
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
              {allOptions.map((option) => (
                <CommandItem
                  key={option}
                  onSelect={() => {
                    handleSelect(option);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {selected.length > 0 && (
          <div className="p-2 border-t">
              <div className="flex gap-1 flex-wrap">
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
                                  handleSelect(item);
                              }}
                          >
                              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </button>
                      </Badge>
                  ))}
              </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
