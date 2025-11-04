

"use client";

import { Settings, LayoutDashboard, CreditCard, Building, Warehouse, Truck, User, History, Layers, PanelLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import { useFilters } from "@/context/filter-context";
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
import { Separator } from "../ui/separator";
import Image from "next/image";
import Logo from '@/app/id-360.png';
import { SidebarTrigger } from "../ui/sidebar";

export function AppHeader() {
  const {
    filterType,
    setFilterType,
    dateRange,
    setDateRange,
    date,
    setDate,
    dateFilterMode,
    setDateFilterMode,
    availableDepots,
    selectedDepot,
    setSelectedDepot,
    availableStores,
    selectedStore,
    setSelectedStore,
    lastUpdateTime,
  } = useFilters();

  const handleDepotChange = (value: string) => {
    setSelectedDepot(value);
    if (value !== 'all') {
      setSelectedStore('all'); // Reset store filter
      setFilterType('entrepot'); // Force filter type to entrepot
    }
  };
  
  const handleStoreChange = (value: string) => {
    setSelectedStore(value);
     if (value !== 'all') {
      setSelectedDepot('all'); // Reset depot filter
      setFilterType('magasin'); // Force filter type to magasin
    }
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  }

  const handleRangeSelect = (selectedRange: typeof dateRange) => {
    setDateRange(selectedRange);
  }


  return (
    <header className="sticky top-0 z-30 w-full border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-20 items-center justify-between gap-4">
        <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden"/>
             <Link href="/" className="flex items-center">
               <Image src={Logo} alt="ID 360 Logo" width={50} height={50} priority className="hidden md:block" />
             </Link>
        </div>

        <div className="flex flex-1 justify-end items-center gap-2 flex-wrap">
          {lastUpdateTime && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground mr-4">
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
                  "w-full sm:w-[260px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                 {dateFilterMode === 'day' && date ? (
                    format(date, "dd LLL y", { locale: fr })
                 ) : dateFilterMode === 'range' && dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd LLL y", { locale: fr })} -{" "}
                      {format(dateRange.to, "dd LLL y", { locale: fr })}
                    </>
                  ) : (
                    format(dateRange.from, "dd LLL y", { locale: fr })
                  )
                ) : (
                  <span>Choisir une date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                 <div className="p-4">
                    <RadioGroup
                        value={dateFilterMode}
                        onValueChange={(value) => setDateFilterMode(value as 'day' | 'range')}
                        className="flex items-center space-x-2"
                    >
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="day" id="day" />
                        <Label htmlFor="day">Jour</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="range" id="range" />
                        <Label htmlFor="range">Période</Label>
                        </div>
                    </RadioGroup>
                </div>
                <Separator />
                {dateFilterMode === 'day' ? (
                     <Calendar
                        initialFocus
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        locale={fr}
                    />
                ) : (
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={handleRangeSelect}
                        numberOfMonths={2}
                        locale={fr}
                    />
                )}
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

          <Select value={selectedStore} onValueChange={handleStoreChange} disabled={filterType === 'entrepot'}>
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

        </div>
      </div>
    </header>
  );
}
