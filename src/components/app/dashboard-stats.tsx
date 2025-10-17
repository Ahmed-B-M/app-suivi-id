
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArchiveX,
  Ban,
  BoxSelect,
  CheckCircle,
  Clock,
  Hourglass,
  ListTodo,
  MapPinOff,
  Megaphone,
  Repeat,
  Route,
  SearchX,
  ShieldAlert,
  Siren,
  Smartphone,
  Star,
  Timer,
  TimerOff,
  Trophy,
  XCircle,
} from "lucide-react";
import { Separator } from "../ui/separator";

type DashboardStatsProps = {
  stats: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageRating: number | null;
    punctualityRate: number | null;
    totalRounds: number;
    completedRounds: number;
    earlyTasksCount: number;
    lateTasksCount: number;
    scanbacRate: number | null;
    forcedAddressRate: number | null;
    forcedContactlessRate: number | null;
    pendingTasks: number;
    missingTasks: number;
    missingBacs: number;
    partialDeliveredTasks: number;
    redeliveries: number;
    failedDeliveryRate: number | null;
    sensitiveDeliveries: number;
    qualityAlerts: number;
  };
  onRatingClick: () => void;
  onEarlyClick: () => void;
  onLateClick: () => void;
  onFailedDeliveryClick: () => void;
  onPendingClick: () => void;
  onMissingClick: () => void;
  onMissingBacsClick: () => void;
  onPartialDeliveredClick: () => void;
  onRedeliveryClick: () => void;
  onSensitiveDeliveriesClick: () => void;
  onQualityAlertClick: () => void;
};

const StatCard = ({ title, value, icon, onClick, "data-testid": dataTestId }: { title: string, value: string | number, icon: React.ReactNode, onClick?: () => void, "data-testid"?: string }) => {
  const isClickable = !!onClick;
  return (
    <Card onClick={onClick} className={isClickable ? "cursor-pointer hover:bg-muted" : ""} data-testid={dataTestId}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="col-span-full text-lg font-semibold mt-6 mb-2">{children}</h3>
);


export function DashboardStats({ 
  stats, 
  onRatingClick, 
  onEarlyClick, 
  onLateClick, 
  onFailedDeliveryClick,
  onPendingClick,
  onMissingClick,
  onMissingBacsClick,
  onPartialDeliveredClick,
  onRedeliveryClick,
  onSensitiveDeliveriesClick,
  onQualityAlertClick,
}: DashboardStatsProps) {
  const gridCols = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

  return (
    <div className={`grid gap-4 ${gridCols}`}>

      <SectionTitle>Performance Clé</SectionTitle>
      
      <StatCard 
        title="Taux d'échec" 
        value={stats.failedDeliveryRate !== null ? `${stats.failedDeliveryRate.toFixed(2)}%` : "N/A"} 
        icon={<ShieldAlert className="h-4 w-4 text-destructive" />} 
        onClick={onFailedDeliveryClick}
      />
      <StatCard 
        title="Ponctualité" 
        value={stats.punctualityRate !== null ? `${stats.punctualityRate.toFixed(2)}%` : "N/A"} 
        icon={<Clock className="h-4 w-4 text-muted-foreground" />} 
      />
       <StatCard 
        title="Note Moyenne" 
        value={stats.averageRating ? stats.averageRating.toFixed(2) : "N/A"} 
        icon={<Star className="h-4 w-4 text-muted-foreground" />} 
        onClick={onRatingClick}
      />
       <StatCard 
        title="SCANBAC" 
        value={stats.scanbacRate !== null ? `${stats.scanbacRate.toFixed(2)}%` : "N/A"} 
        icon={<Smartphone className="h-4 w-4 text-muted-foreground" />} 
      />
      <StatCard 
        title="Sur place forcé" 
        value={stats.forcedAddressRate !== null ? `${stats.forcedAddressRate.toFixed(2)}%` : "N/A"} 
        icon={<MapPinOff className="h-4 w-4 text-muted-foreground" />} 
      />
      <StatCard 
        title="Commandes forcées" 
        value={stats.forcedContactlessRate !== null ? `${stats.forcedContactlessRate.toFixed(2)}%` : "N/A"} 
        icon={<Ban className="h-4 w-4 text-muted-foreground" />} 
      />
      
      <SectionTitle>Analyse de la Qualité</SectionTitle>

      <StatCard
        title="Alerte qualité"
        value={stats.qualityAlerts}
        icon={<Megaphone className="h-4 w-4 text-red-600" />}
        onClick={onQualityAlertClick}
      />
      <StatCard 
        title="Tâches en Avance" 
        value={stats.earlyTasksCount} 
        icon={<Timer className="h-4 w-4 text-green-500" />} 
        onClick={onEarlyClick}
      />
      <StatCard 
        title="Tâches en Retard" 
        value={stats.lateTasksCount} 
        icon={<TimerOff className="h-4 w-4 text-red-500" />} 
        onClick={onLateClick}
      />
     
      <SectionTitle>Anomalies et Suivi</SectionTitle>
      
      <StatCard 
        title="Échecs Livraison" 
        value={stats.failedTasks} 
        icon={<XCircle className="h-4 w-4 text-destructive" />} 
        onClick={onFailedDeliveryClick}
      />
       <StatCard 
        title="Relivraisons" 
        value={stats.redeliveries} 
        icon={<Repeat className="h-4 w-4 text-orange-500" />} 
        onClick={onRedeliveryClick}
      />
       <StatCard 
        title="Tâches en attente" 
        value={stats.pendingTasks} 
        icon={<Hourglass className="h-4 w-4 text-blue-500" />} 
        onClick={onPendingClick}
      />
       <StatCard 
        title="Tâches manquantes" 
        value={stats.missingTasks} 
        icon={<SearchX className="h-4 w-4 text-orange-500" />} 
        onClick={onMissingClick}
      />
       <StatCard 
        title="Bacs manquants" 
        value={stats.missingBacs} 
        icon={<ArchiveX className="h-4 w-4 text-amber-600" />} 
        onClick={onMissingBacsClick}
      />
      <StatCard 
        title="Livraisons partielles" 
        value={stats.partialDeliveredTasks} 
        icon={<BoxSelect className="h-4 w-4 text-indigo-500" />} 
        onClick={onPartialDeliveredClick}
      />
      <StatCard 
        title="Livraisons Sensibles" 
        value={stats.sensitiveDeliveries} 
        icon={<Siren className="h-4 w-4 text-red-600" />} 
        onClick={onSensitiveDeliveriesClick}
      />

       <SectionTitle>Vue d'Ensemble</SectionTitle>
      <StatCard title="Tâches Totales" value={stats.totalTasks} icon={<ListTodo className="h-4 w-4 text-muted-foreground" />} />
      <StatCard title="Tâches Terminées" value={stats.completedTasks} icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />} />
      <StatCard title="Tournées Totales" value={stats.totalRounds} icon={<Route className="h-4 w-4 text-muted-foreground" />} />
      <StatCard title="Tournées Terminées" value={stats.completedRounds} icon={<Trophy className="h-4 w-4 text-muted-foreground" />} />

    </div>
  );
}
