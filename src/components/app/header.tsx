
"use client";

import { Layers, Settings, LayoutDashboard, CreditCard, Building, Warehouse, Truck, User } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import { useFilterContext } from "@/context/filter-context";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPOTS_LIST } from "@/lib/grouping";

export function AppHeader() {
  const {
    filterType,
    setFilterType,
    dateRange,
    setDateRange,
    availableDepots,
    selectedDepot,
    setSelectedDepot,
    availableStores,
    selectedStore,
    setSelectedStore,
  } = useFilterContext();

  const handleDepotChange = (value: string) => {
    setSelectedDepot(value);
    if (value !== 'all') {
      setSelectedStore('all'); 
    }
  };

  const handleStoreChange = (value: string) => {
    setSelectedStore(value);
     if (value !== 'all') {
      setSelectedDepot('all'); 
    }
  };


  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="mr-4 flex items-center">
          <Link href="/" className="flex items-center">
            <Layers className="h-6 w-6 mr-3 text-primary" />
            <span className="font-bold text-lg text-primary">ID-pilote</span>
          </Link>
        </div>
        <nav className="flex items-center gap-2">
          <RadioGroup
            value={filterType}
            onValueChange={(value) => setFilterType(value as 'tous' | 'depot' | 'magasin')}
            className="flex items-center space-x-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="tous" id="tous" />
              <Label htmlFor="tous">Tous</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="depot" id="depot" />
              <Label htmlFor="depot">Dépôts</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="magasin" id="magasin" />
              <Label htmlFor="magasin">Entrepôts</Label>
            </div>
          </RadioGroup>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[260px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Choisir une période</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          
           <Select value={selectedDepot} onValueChange={handleDepotChange} disabled={filterType === 'magasin'}>
            <SelectTrigger className="w-[180px]">
              <Building className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrer par dépôt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les dépôts</SelectItem>
              {availableDepots.map((depot) => (
                <SelectItem key={depot} value={depot}>
                  {depot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStore} onValueChange={handleStoreChange} disabled={filterType === 'depot'}>
            <SelectTrigger className="w-[180px]">
              <Warehouse className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrer par entrepôt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les entrepôts</SelectItem>
              {availableStores.map((store) => (
                <SelectItem key={store} value={store}>
                  {store}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </nav>
      </div>
    </header>
  );
}
