
"use client";

import { Layers, Settings, LayoutDashboard, CreditCard, Building, Warehouse, Truck, User, History } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import { useFilterContext } from "@/context/filter-context";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
    lastUpdateTime,
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
        <div className="mr-4 hidden items-center md:flex">
          <Link href="/" className="flex items-center">
            <Layers className="h-6 w-6 mr-3 text-primary" />
            <span className="font-bold text-lg text-primary">ID-pilote</span>
          </Link>
        </div>
        <div className="flex-1 flex justify-end items-center gap-2">
          {lastUpdateTime && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mr-4">
              <History className="h-4 w-4" />
              <span>Dernière synchro: {format(lastUpdateTime, "dd/MM/yy HH:mm", { locale: fr })}</span>
            </div>
          )}

          <RadioGroup
            value={filterType}
            onValueChange={(value) => setFilterType(value as 'tous' | 'magasin' | 'entrepot')}
            className="hidden sm:flex items-center space-x-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="tous" id="tous" />
              <Label htmlFor="tous">Tous</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="magasin" id="magasin" />
              <Label htmlFor="magasin">Magasins</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="entrepot" id="entrepot" />
              <Label htmlFor="entrepot">Entrepôts</Label>
            </div>
          </RadioGroup>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[180px] sm:w-[260px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd LLL y", { locale: fr })} -{" "}
                      {format(dateRange.to, "dd LLL y", { locale: fr })}
                    </>
                  ) : (
                    format(dateRange.from, "dd LLL y", { locale: fr })
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
                locale={fr}
              />
            </PopoverContent>
          </Popover>
          
           <Select value={selectedDepot} onValueChange={handleDepotChange} disabled={filterType === 'magasin'}>
            <SelectTrigger className="hidden md:flex w-[180px]">
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

          <Select value={selectedStore} onValueChange={handleStoreChange} disabled={filterType === 'entrepot'}>
            <SelectTrigger className="hidden lg:flex w-[180px]">
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

        </div>
      </div>
    </header>
  );
}
