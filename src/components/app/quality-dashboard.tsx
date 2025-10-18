

"use client";

import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star, Building, Truck, User, AlertTriangle, Percent, Hash, Search, Award, Clock, Smartphone, MapPinOff, Ban, ListTodo } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";
import { DriverStats } from "@/lib/scoring";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn } from "@/lib/utils";

// Data structures
interface DriverQuality extends DriverStats {
  score: number;
}

interface CarrierQuality extends Omit<DriverStats, 'name'|'totalTasks'|'completedTasks'|'score'> {
  name: string;
  totalRatings: number;
  totalAlerts: number;
  alertRate: number | null;
  drivers: DriverQuality[];
}

interface DepotQuality extends Omit<DriverStats, 'name'|'totalTasks'|'completedTasks'|'score'> {
  name: string;
  totalRatings: number;
  totalAlerts: number;
  alertRate: number | null;
  carriers: CarrierQuality[];
}

export interface QualityData {
  summary: {
    totalRatings: number;
    totalAlerts: number;
    alertRate: number;
    averageRating: number | null;
    punctualityRate: number | null;
    scanbacRate: number | null;
    forcedAddressRate: number | null;
    forcedContactlessRate: number | null;
    score: number;
  };
  details: DepotQuality[];
}

// Props
interface QualityDashboardProps {
  data: QualityData | null;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// Components
const StatCard = ({ title, value, icon, variant = 'default' }: { title: string, value: string, icon: React.ReactNode, variant?: 'default' | 'success' | 'danger' | 'warning' }) => {
    const valueColor = 
      variant === 'success' ? 'text-green-600' : 
      variant === 'danger' ? 'text-red-600' : 
      variant === 'warning' ? 'text-orange-500' : '';
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
            </CardContent>
        </Card>
    )
};

const StatBadge = ({ value, icon, tooltipText, isRate = true, isLowerBetter = false }: { value: number | null, icon: React.ReactNode, tooltipText: string, isRate?: boolean, isLowerBetter?: boolean }) => {
  let colorClass = "bg-secondary text-secondary-foreground";
  
  if (value !== null) {
    if (isRate) { // For percentage-based rates
      if (isLowerBetter) { // Lower is better (e.g., forced address rate)
        if (value <= 2) colorClass = "bg-green-700 text-white";       // Excellent
        else if (value <= 5) colorClass = "bg-green-500 text-white";  // Good (target)
        else if (value <= 10) colorClass = "bg-yellow-500 text-black"; // Average
        else if (value <= 15) colorClass = "bg-orange-500 text-white"; // Warning
        else colorClass = "bg-red-600 text-white";                   // Poor
      } else { // Higher is better (e.g., punctuality)
        if (value >= 98) colorClass = "bg-green-700 text-white";      // Excellent
        else if (value >= 95) colorClass = "bg-green-500 text-white"; // Good (target)
        else if (value >= 90) colorClass = "bg-yellow-500 text-black";// Average
        else if (value >= 85) colorClass = "bg-orange-500 text-white"; // Warning
        else colorClass = "bg-red-600 text-white";                   // Poor
      }
    } else { // For ratings (not a rate, scale of 1-5)
      if (value >= 4.9) colorClass = "bg-green-700 text-white";      // Excellent
      else if (value >= 4.8) colorClass = "bg-green-500 text-white"; // Good (target)
      else if (value >= 4.5) colorClass = "bg-yellow-500 text-black";// Average
      else if (value >= 4.0) colorClass = "bg-orange-500 text-white"; // Warning
      else colorClass = "bg-red-600 text-white";                   // Poor
    }
  }


  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
            <Badge className={cn("flex gap-1.5 min-w-[70px] justify-center border-transparent", colorClass)}>
              {icon} 
              {value !== null ? value.toFixed(isRate ? 1 : 2) : 'N/A'}
              {isRate && '%'}
            </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
