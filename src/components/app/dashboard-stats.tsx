
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Clock,
  ListTodo,
  MapPinOff,
  Route,
  Smartphone,
  Star,
  Timer,
  TimerOff,
  Trophy,
  XCircle,
} from "lucide-react";

type DashboardStatsProps = {
  stats: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    unplannedTasks: number;
    averageRating: number | null;
    punctualityRate: number | null;
    totalRounds: number;
    completedRounds: number;
    earlyTasksCount: number;
    lateTasksCount: number;
    scanbacRate: number | null;
    forcedAddressRate: number | null;
    forcedContactlessRate: number | null;
  };
  onRatingClick: () => void;
  onEarlyClick: () => void;
  onLateClick: () => void;
  onFailedDeliveryClick: () => void;
};

export function DashboardStats({ stats, onRatingClick, onEarlyClick, onLateClick, onFailedDeliveryClick }: DashboardStatsProps) {
  const gridCols = "grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";

  return (
    <div className={`grid gap-4 ${gridCols}`}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tâches Totales</CardTitle>
          <ListTodo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalTasks}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tâches Terminées</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completedTasks}</div>
        </CardContent>
      </Card>
      <Card onClick={onFailedDeliveryClick} className="cursor-pointer hover:bg-muted">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Échecs Livraison</CardTitle>
          <XCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{stats.failedTasks}</div>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ponctualité</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.punctualityRate !== null ? `${stats.punctualityRate.toFixed(2)}%` : "N/A"}
          </div>
        </CardContent>
      </Card>
       <Card onClick={onEarlyClick} className="cursor-pointer hover:bg-muted">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tâches en Avance</CardTitle>
          <Timer className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">{stats.earlyTasksCount}</div>
        </CardContent>
      </Card>
       <Card onClick={onLateClick} className="cursor-pointer hover:bg-muted">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tâches en Retard</CardTitle>
          <TimerOff className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">{stats.lateTasksCount}</div>
        </CardContent>
      </Card>
      <Card onClick={onRatingClick} className="cursor-pointer hover:bg-muted">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Note Moyenne</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.averageRating ? stats.averageRating.toFixed(2) : "N/A"}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">SCANBAC</CardTitle>
          <Smartphone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.scanbacRate !== null ? `${stats.scanbacRate.toFixed(2)}%` : "N/A"}
          </div>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sur place forcé</CardTitle>
          <MapPinOff className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.forcedAddressRate !== null ? `${stats.forcedAddressRate.toFixed(2)}%` : "N/A"}
          </div>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Commandes forcées</CardTitle>
          <Ban className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.forcedContactlessRate !== null ? `${stats.forcedContactlessRate.toFixed(2)}%` : "N/A"}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Tâches non planifiées
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.unplannedTasks}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tournées Totales</CardTitle>
          <Route className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalRounds}</div>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tournées Terminées</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completedRounds}</div>
        </CardContent>
      </Card>
    </div>
  );
}
