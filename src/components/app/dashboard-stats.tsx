
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArchiveX,
  Ban,
  BoxSelect,
  CheckCircle,
  Clock,
  Crown,
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
  User,
  XCircle,
} from "lucide-react";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";

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
    numberOfRatings: number;
    ratingRate: number | null;
    topDrivers: { name: string; count: number; avgRating: number }[];
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

const StatCard = ({ title, icon, onClick, children, "data-testid": dataTestId }: { title: string, icon: React.ReactNode, onClick?: () => void, children: React.ReactNode, "data-testid"?: string }) => {
  const isClickable = !!onClick;
  return (
    <Card onClick={onClick} className={isClickable ? "cursor-pointer hover:bg-muted" : ""} data-testid={dataTestId}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {children}
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
        icon={<ShieldAlert className="h-4 w-4 text-destructive" />} 
        onClick={onFailedDeliveryClick}
      >
        <div className="text-2xl font-bold">{stats.failedDeliveryRate !== null ? `${stats.failedDeliveryRate.toFixed(2)}%` : "N/A"}</div>
      </StatCard>
      <StatCard 
        title="Ponctualité" 
        icon={<Clock className="h-4 w-4 text-muted-foreground" />} 
      >
        <div className="text-2xl font-bold">{stats.punctualityRate !== null ? `${stats.punctualityRate.toFixed(2)}%` : "N/A"}</div>
      </StatCard>
       <StatCard 
        title="Note Moyenne" 
        icon={<Star className="h-4 w-4 text-muted-foreground" />} 
        onClick={onRatingClick}
      >
        <div className="text-2xl font-bold flex items-baseline gap-2">
          {stats.averageRating ? stats.averageRating.toFixed(2) : "N/A"}
          {stats.numberOfRatings > 0 && stats.ratingRate !== null && (
            <span className="text-xs font-normal text-muted-foreground">
              ({stats.numberOfRatings} notes, {stats.ratingRate.toFixed(0)}%)
            </span>
          )}
        </div>
      </StatCard>
       <StatCard 
        title="SCANBAC" 
        icon={<Smartphone className="h-4 w-4 text-muted-foreground" />} 
      >
        <div className="text-2xl font-bold">{stats.scanbacRate !== null ? `${stats.scanbacRate.toFixed(2)}%` : "N/A"}</div>
      </StatCard>
      <StatCard
        title="Top 3 Livreurs (5★)"
        icon={<Crown className="h-4 w-4 text-yellow-500" />}
      >
        {stats.topDrivers.length > 0 ? (
           <div className="space-y-1 pt-1">
            {stats.topDrivers.map((driver, index) => (
              <div key={index} className="text-xs flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-muted-foreground"/>
                  <span className="font-medium truncate">{driver.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {driver.avgRating.toFixed(2)}
                  </Badge>
                  <div className="font-bold flex items-center gap-1">
                    {driver.count}
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400"/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune note de 5★</p>
        )}
      </StatCard>
      
      <SectionTitle>Analyse de la Qualité</SectionTitle>

      <StatCard
        title="Alerte qualité"
        icon={<Megaphone className="h-4 w-4 text-red-600" />}
        onClick={onQualityAlertClick}
      >
        <div className="text-2xl font-bold">{stats.qualityAlerts}</div>
      </StatCard>
      <StatCard 
        title="Tâches en Avance" 
        icon={<Timer className="h-4 w-4 text-green-500" />} 
        onClick={onEarlyClick}
      >
        <div className="text-2xl font-bold">{stats.earlyTasksCount}</div>
      </StatCard>
      <StatCard 
        title="Tâches en Retard" 
        icon={<TimerOff className="h-4 w-4 text-red-500" />} 
        onClick={onLateClick}
      >
        <div className="text-2xl font-bold">{stats.lateTasksCount}</div>
      </StatCard>
     
      <SectionTitle>Anomalies et Suivi</SectionTitle>
      
      <StatCard 
        title="Échecs Livraison" 
        icon={<XCircle className="h-4 w-4 text-destructive" />} 
        onClick={onFailedDeliveryClick}
      >
        <div className="text-2xl font-bold">{stats.failedTasks}</div>
      </StatCard>
       <StatCard 
        title="Relivraisons" 
        icon={<Repeat className="h-4 w-4 text-orange-500" />} 
        onClick={onRedeliveryClick}
      >
        <div className="text-2xl font-bold">{stats.redeliveries}</div>
      </StatCard>
       <StatCard 
        title="Tâches en attente" 
        icon={<Hourglass className="h-4 w-4 text-blue-500" />} 
        onClick={onPendingClick}
      >
        <div className="text-2xl font-bold">{stats.pendingTasks}</div>
      </StatCard>
       <StatCard 
        title="Tâches manquantes" 
        icon={<SearchX className="h-4 w-4 text-orange-500" />} 
        onClick={onMissingClick}
      >
        <div className="text-2xl font-bold">{stats.missingTasks}</div>
      </StatCard>
       <StatCard 
        title="Bacs manquants" 
        icon={<ArchiveX className="h-4 w-4 text-amber-600" />} 
        onClick={onMissingBacsClick}
      >
        <div className="text-2xl font-bold">{stats.missingBacs}</div>
      </StatCard>
      <StatCard 
        title="Livraisons partielles" 
        icon={<BoxSelect className="h-4 w-4 text-indigo-500" />} 
        onClick={onPartialDeliveredClick}
      >
        <div className="text-2xl font-bold">{stats.partialDeliveredTasks}</div>
      </StatCard>
      <StatCard 
        title="Livraisons Sensibles" 
        icon={<Siren className="h-4 w-4 text-red-600" />} 
        onClick={onSensitiveDeliveriesClick}
      >
        <div className="text-2xl font-bold">{stats.sensitiveDeliveries}</div>
      </StatCard>
      <StatCard 
        title="Sur place forcé" 
        icon={<MapPinOff className="h-4 w-4 text-muted-foreground" />} 
      >
        <div className="text-2xl font-bold">{stats.forcedAddressRate !== null ? `${stats.forcedAddressRate.toFixed(2)}%` : "N/A"}</div>
      </StatCard>
      <StatCard 
        title="Commandes forcées" 
        icon={<Ban className="h-4 w-4 text-muted-foreground" />} 
      >
        <div className="text-2xl font-bold">{stats.forcedContactlessRate !== null ? `${stats.forcedContactlessRate.toFixed(2)}%` : "N/A"}</div>
      </StatCard>


       <SectionTitle>Vue d'Ensemble</SectionTitle>
      <StatCard title="Tâches Totales" icon={<ListTodo className="h-4 w-4 text-muted-foreground" />}>
        <div className="text-2xl font-bold">{stats.totalTasks}</div>
      </StatCard>
      <StatCard title="Tâches Terminées" icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}>
        <div className="text-2xl font-bold">{stats.completedTasks}</div>
      </StatCard>
      <StatCard title="Tournées Totales" icon={<Route className="h-4 w-4 text-muted-foreground" />}>
        <div className="text-2xl font-bold">{stats.totalRounds}</div>
      </StatCard>
      <StatCard title="Tournées Terminées" icon={<Trophy className="h-4 w-4 text-muted-foreground" />}>
        <div className="text-2xl font-bold">{stats.completedRounds}</div>
      </StatCard>

    </div>
  );
}

    