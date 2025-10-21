
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArchiveX,
  Ban,
  BoxSelect,
  CheckCircle,
  Clock,
  Crown,
  ListTodo,
  MapPinOff,
  Megaphone,
  Repeat,
  Route,
  SearchX,
  ShieldAlert,
  Smartphone,
  Star,
  TimerOff,
  Trophy,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Badge } from "../ui/badge";
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
    lateOver1hRate: number | null;
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
  };
  topDrivers: { name: string; fiveStarCount: number }[];
  onRatingClick: () => void;
  onEarlyClick: () => void;
  onLateClick: () => void;
  onLateOver1hClick: () => void;
  onFailedDeliveryClick: () => void;
  onPendingClick: () => void;
  onMissingClick: () => void;
  onMissingBacsClick: () => void;
  onPartialDeliveredClick: () => void;
  onRedeliveryClick: () => void;
  onSensitiveDeliveriesClick: () => void;
  onQualityAlertClick: () => void;
  onTotalRoundsClick: () => void;
  onTotalTasksClick: () => void;
};

const StatCard = ({
  title,
  value,
  icon,
  onClick,
  description,
  variant = "default",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  onClick?: () => void;
  description?: string;
  variant?: "default" | "success" | "warning" | "danger";
}) => {
  const valueColor =
    variant === "success"
      ? "text-green-600"
      : variant === "danger"
      ? "text-red-600"
      : variant === "warning"
      ? "text-orange-500"
      : "";

  return (
    <Card
      onClick={onClick}
      className={onClick ? "cursor-pointer hover:bg-muted/50" : ""}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground pt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

const MiniStat = ({ title, value, icon, onClick }: { title: string, value: string, icon: React.ReactNode, onClick?: () => void }) => (
    <div className={`flex items-center justify-between space-x-4 p-3 rounded-lg ${onClick ? 'cursor-pointer hover:bg-muted' : ''}`} onClick={onClick}>
        <div className="flex items-center space-x-2">
            {icon}
            <p className="text-sm font-medium">{title}</p>
        </div>
        <p className="text-sm font-semibold">{value}</p>
    </div>
);


export function DashboardStats({
  stats,
  topDrivers,
  onRatingClick,
  onEarlyClick,
  onLateClick,
  onLateOver1hClick,
  onFailedDeliveryClick,
  onPendingClick,
  onMissingClick,
  onMissingBacsClick,
  onPartialDeliveredClick,
  onRedeliveryClick,
  onSensitiveDeliveriesClick,
  onQualityAlertClick,
  onTotalRoundsClick,
  onTotalTasksClick,
}: DashboardStatsProps) {
  const getVariant = (
    value: number | null,
    thresholds: { success: number; warning: number; isHigherBetter: boolean }
  ): "success" | "warning" | "danger" => {
    if (value === null) return "danger";
    if (thresholds.isHigherBetter) {
      if (value >= thresholds.success) return "success";
      if (value >= thresholds.warning) return "warning";
    } else {
      if (value <= thresholds.success) return "success";
      if (value <= thresholds.warning) return "warning";
    }
    return "danger";
  };

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <StatCard
          title="Taux d'échec"
          value={
            stats.failedDeliveryRate !== null
              ? `${stats.failedDeliveryRate.toFixed(2)}%`
              : "N/A"
          }
          icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
          onClick={onFailedDeliveryClick}
          variant={getVariant(stats.failedDeliveryRate, {
            success: 1,
            warning: 3,
            isHigherBetter: false,
          })}
          description={`${stats.failedTasks} échecs / ${stats.completedTasks} terminées`}
        />
        <StatCard
          title="Ponctualité"
          value={
            stats.punctualityRate !== null
              ? `${stats.punctualityRate.toFixed(2)}%`
              : "N/A"
          }
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          variant={getVariant(stats.punctualityRate, {
            success: 95,
            warning: 90,
            isHigherBetter: true,
          })}
          description={`${stats.earlyTasksCount} en avance, ${stats.lateTasksCount} en retard`}
        />
        <StatCard
          title="Note Moyenne"
          icon={<Star className="h-4 w-4 text-muted-foreground" />}
          onClick={onRatingClick}
          variant={getVariant(stats.averageRating, {
            success: 4.79,
            warning: 4.5,
            isHigherBetter: true,
          })}
          value={stats.averageRating ? stats.averageRating.toFixed(2) : "N/A"}
          description={
            stats.numberOfRatings > 0 && stats.ratingRate !== null
              ? `${stats.numberOfRatings} notes (${stats.ratingRate.toFixed(
                  0
                )}% de participation)`
              : "Aucune note"
          }
        />
        <StatCard
          title="SCANBAC"
          value={
            stats.scanbacRate !== null
              ? `${stats.scanbacRate.toFixed(2)}%`
              : "N/A"
          }
          icon={<Smartphone className="h-4 w-4 text-muted-foreground" />}
          variant={getVariant(stats.scanbacRate, {
            success: 95,
            warning: 90,
            isHigherBetter: true,
          })}
          description="Validation via l'app mobile"
        />
         <StatCard 
            title="Sur place forcé" 
            value={`${stats.forcedAddressRate?.toFixed(2) ?? 'N/A'}%`} 
            icon={<MapPinOff className="h-4 w-4 text-muted-foreground" />} 
            variant={getVariant(stats.forcedAddressRate, { success: 2, warning: 5, isHigherBetter: false })}
          />
        <StatCard 
            title="Commandes forcées" 
            value={`${stats.forcedContactlessRate?.toFixed(2) ?? 'N/A'}%`} 
            icon={<Ban className="h-4 w-4 text-muted-foreground" />} 
            variant={getVariant(stats.forcedContactlessRate, { success: 2, warning: 5, isHigherBetter: false })}
        />
      </div>

      {/* Secondary KPIs and Anomalies */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Performance &amp; Qualité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <MiniStat title="Tâches en avance" value={stats.earlyTasksCount.toString()} icon={<TrendingUp className="h-5 w-5 text-green-500" />} onClick={onEarlyClick}/>
            <Separator />
            <MiniStat title="Tâches en retard" value={stats.lateTasksCount.toString()} icon={<TrendingDown className="h-5 w-5 text-orange-500" />} onClick={onLateClick}/>
            <Separator />
            <MiniStat title="Taux de retard &gt; 1h" value={`${stats.lateOver1hRate?.toFixed(2) ?? 'N/A'}%`} icon={<TimerOff className="h-5 w-5 text-red-500" />} onClick={onLateOver1hClick}/>
            <Separator />
            <MiniStat title="Alerte qualité (note &lt; 4)" value={stats.qualityAlerts.toString()} icon={<Megaphone className="h-5 w-5 text-destructive" />} onClick={onQualityAlertClick}/>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Anomalies &amp; Suivi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <MiniStat title="Relivraisons" value={stats.redeliveries.toString()} icon={<Repeat className="h-5 w-5 text-blue-500" />} onClick={onRedeliveryClick}/>
            <Separator />
            <MiniStat title="Livraisons sensibles" value={stats.sensitiveDeliveries.toString()} icon={<ShieldAlert className="h-5 w-5 text-purple-500" />} onClick={onSensitiveDeliveriesClick}/>
            <Separator />
            <MiniStat title="Tâches manquantes" value={stats.missingTasks.toString()} icon={<SearchX className="h-5 w-5 text-orange-500" />} onClick={onMissingClick}/>
            <Separator />
            <MiniStat title="Bacs manquants" value={stats.missingBacs.toString()} icon={<ArchiveX className="h-5 w-5 text-amber-600" />} onClick={onMissingBacsClick}/>
             <Separator />
            <MiniStat title="Livraisons partielles" value={stats.partialDeliveredTasks.toString()} icon={<BoxSelect className="h-5 w-5 text-indigo-500" />} onClick={onPartialDeliveredClick}/>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="text-yellow-500" />
              Top Livreurs (5★)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topDrivers.length > 0 ? (
              <ol className="space-y-2 text-sm">
                {topDrivers.map((driver, index) => (
                  <li
                    key={driver.name}
                    className="flex items-center justify-between"
                  >
                    <span className="font-medium">
                      {index + 1}. {driver.name}
                    </span>
                    <Badge
                      variant="default"
                      className="flex items-center gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                    >
                      {driver.fiveStarCount}{" "}
                      <Star className="h-3 w-3 fill-current" />
                    </Badge>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune note 5 étoiles.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Tâches Totales" value={stats.totalTasks.toString()} icon={<ListTodo className="h-4 w-4 text-muted-foreground" />} onClick={onTotalTasksClick} />
          <StatCard title="Tâches Terminées" value={stats.completedTasks.toString()} icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />} />
          <StatCard title="Tournées Totales" value={stats.totalRounds.toString()} icon={<Route className="h-4 w-4 text-muted-foreground" />} onClick={onTotalRoundsClick} />
          <StatCard title="Tournées Terminées" value={stats.completedRounds.toString()} icon={<Trophy className="h-4 w-4 text-muted-foreground" />} />
       </div>
    </div>
  );
}
