

import type { Tache, Tournee } from "@/lib/types";
import { calculateRawDriverStats, calculateDriverScore } from "./scoring";
import { getDriverFullName } from "./grouping";
import { addMinutes, differenceInMinutes, subMinutes } from "date-fns";

const FAILED_PROGRESSIONS = ['FAILED', 'CANCELLED'];
const FAILED_STATUSES = ['DELIVERY_FAILED', 'NOT_DELIVERED', 'CANCELLED', 'REJECTED'];
const SENSITIVE_CLIENTS = ['RENAULT', 'PORSCHE']; // Example sensitive clients
const QUALITY_ALERT_RATING = 3;

/**
 * Categorizes a comment based on keywords.
 * @param comment - The customer comment string.
 * @returns The determined category.
 */
export function getCategoryFromKeywords(comment: string): string {
    const lowerComment = comment.toLowerCase();
    
    const categoryKeywords: Record<string, string[]> = {
        'Attitude livreur': ['agressif', 'impoli', 'pas aimable', 'dispute'],
        'Amabilité livreur': ['sourire', 'aimable', 'gentil', 'serviable', 'courtois'],
        'Casse produit': ['casse', 'abime', 'endommage', 'produit abîmé'],
        'Manquant produit': ['manque', 'manquant', 'pas recu', 'produit manquant'],
        'Manquant multiple': ['plusieurs manquants', 'nombreux produits manquants'],
        'Manquant bac': ['bac manquant', 'bac non repris'],
        'Non livré': ['non livre', 'pas livre', 'jamais recu'],
        'Erreur de préparation': ['erreur de commande', 'mauvais produit', 'erreur sur la commande'],
        'Erreur de livraison': ['erreur d\'adresse', 'mauvaise adresse', 'pas le bon client'],
        'Livraison en avance': ['en avance', 'trop tot', 'avant l\'heure'],
        'Livraison en retard': ['en retard', 'trop tard', 'apres l\'heure'],
        'Rupture chaine de froid': ['froid', 'chaud', 'decongele', 'pas frais'],
        'Process': ['process', 'application', 'site web', 'communication'],
        'Non pertinent': ['merci', 'ras', 'ok', 'nickel', 'parfait']
    };

    for (const category in categoryKeywords) {
        if (categoryKeywords[category].some(keyword => lowerComment.includes(keyword))) {
            return category;
        }
    }
    
    return 'Autre';
}


export function calculateDashboardStats(tasks: Tache[], rounds: Tournee[]) {
    if (!tasks || !rounds) {
      return { hasData: false };
    }
  
    const completedTasks = tasks.filter(t => t.progression === "COMPLETED");
    
    const failedTasks = tasks.filter(t => 
        (t.progression && FAILED_PROGRESSIONS.includes(t.progression.toUpperCase())) || 
        (t.status && FAILED_STATUSES.includes(t.status.toUpperCase()))
    );
    
    const ratedTasks = completedTasks.map(t => t.metaDonnees?.notationLivreur).filter((r): r is number => typeof r === 'number');
    const averageRating = ratedTasks.length > 0 ? ratedTasks.reduce((a, b) => a + b, 0) / ratedTasks.length : null;
    const numberOfRatings = ratedTasks.length;
    const ratingRate = completedTasks.length > 0 ? (numberOfRatings / completedTasks.length) * 100 : null;

    const punctualityTasks = completedTasks.filter(t => t.creneauHoraire?.debut && t.dateCloture);
    let punctualCount = 0;
    const earlyTasks: { task: Tache; minutes: number }[] = [];
    const lateTasks: { task: Tache; minutes: number }[] = [];
    const lateTasksOver1h: { task: Tache; minutes: number }[] = [];

    punctualityTasks.forEach(task => {
        try {
            const closure = new Date(task.dateCloture!);
            const windowStart = new Date(task.creneauHoraire!.debut!);
            const windowEnd = task.creneauHoraire!.fin ? new Date(task.creneauHoraire!.fin) : addMinutes(windowStart, 120);

            const earlyLimit = subMinutes(windowStart, 15);
            const lateLimit = addMinutes(windowEnd, 15);
            
            if (closure < earlyLimit) {
                earlyTasks.push({ task, minutes: differenceInMinutes(earlyLimit, closure) });
            } else if (closure > lateLimit) {
                const minutesLate = differenceInMinutes(closure, lateLimit);
                lateTasks.push({ task, minutes: minutesLate });
                if (minutesLate > 60) {
                  lateTasksOver1h.push({ task, minutes: minutesLate });
                }
            } else {
                punctualCount++;
            }
        } catch(e) {
            // Ignore date parsing errors
        }
    });

    const punctualityRate = punctualityTasks.length > 0 ? (punctualCount / punctualityTasks.length) * 100 : null;

    const completedRounds = rounds.filter(r => r.status === "COMPLETED");

    const scanbacRate = completedTasks.length > 0 ? (completedTasks.filter(t => t.completePar === 'mobile').length / completedTasks.length) * 100 : null;
    const forcedAddressRate = completedTasks.length > 0 ? (completedTasks.filter(t => t.heureReelle?.arrivee?.adresseCorrecte === false).length / completedTasks.length) * 100 : null;
    const forcedContactlessRate = completedTasks.length > 0 ? (completedTasks.filter(t => t.execution?.sansContact?.forced === true).length / completedTasks.length) * 100 : null;

    const pendingTasksList = tasks.filter(t => t.status === 'PENDING');
    const missingTasksList = tasks.filter(t => t.status === 'MISSING');
    
    const tasksWithMissingBacs = tasks.flatMap(task => 
        (task.articles ?? [])
          .filter(item => item.statut === 'MISSING')
          .map(item => ({ task, bac: item }))
    );

    const partialDeliveredTasksList = tasks.filter(t => t.status === 'PARTIAL_DELIVERED');
    const redeliveriesList = tasks.filter(t => (t.tentatives ?? 1) >= 2);
    const sensitiveDeliveriesList = tasks.filter(t => SENSITIVE_CLIENTS.includes(t.client?.toUpperCase() ?? ''));
    const qualityAlertTasks = tasks.filter(t => typeof t.metaDonnees?.notationLivreur === 'number' && t.metaDonnees.notationLivreur <= QUALITY_ALERT_RATING);

    // Group tasks by status for chart
    const tasksByStatus = Object.entries(tasks.reduce((acc, task) => {
        const status = task.status || "Unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    // Group tasks by progression for chart
    const tasksByProgression = Object.entries(tasks.reduce((acc, task) => {
        const progression = task.progression || "Unknown";
        acc[progression] = (acc[progression] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    // Group tasks by date
    const tasksOverTime = Object.entries(tasks.reduce((acc, task) => {
      const date = task.unplanned ? 'Unplanned' : (task.date ? task.date.split("T")[0] : "Unknown");
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)).map(([date, count]) => ({ date, count }));

    // Group rounds by status
    const roundsByStatus = Object.entries(rounds.reduce((acc, round) => {
      const status = round.status || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));
    
    // Group rounds by date
    const roundsOverTime = Object.entries(rounds.reduce((acc, round) => {
      const date = round.date ? round.date.split("T")[0] : "Unknown";
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)).map(([date, count]) => ({ date, count }));
    
    const driverTasks: { [key: string]: Tache[] } = {};
    tasks.forEach(task => {
        const driverName = getDriverFullName(task);
        if (driverName) {
            if (!driverTasks[driverName]) driverTasks[driverName] = [];
            driverTasks[driverName].push(task);
        }
    });

    const rawDriverStats = Object.entries(driverTasks).map(([name, driverTasks]) => {
      return calculateRawDriverStats(name, driverTasks);
    });

    const maxCompletedTasks = Math.max(0, ...rawDriverStats.map(s => s.completedTasks));

    const driverPerformance = rawDriverStats
        .map(rawStats => ({
            ...rawStats,
            score: calculateDriverScore(rawStats, maxCompletedTasks),
        }))
        .filter(stats => stats.totalRatings > 0);

    const top5StarDrivers = Object.entries(
        tasks.reduce((acc, task) => {
            if (task.metaDonnees?.notationLivreur === 5) {
                const driverName = getDriverFullName(task);
                if (driverName) {
                    acc[driverName] = (acc[driverName] || 0) + 1;
                }
            }
            return acc;
        }, {} as Record<string, number>)
    ).map(([name, fiveStarCount]) => ({ name, fiveStarCount })).sort((a, b) => b.fiveStarCount - a.fiveStarCount).slice(0, 5);


    const hasData = tasks.length > 0 || rounds.length > 0;

    return {
      hasData,
      stats: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        failedTasks: failedTasks.length,
        averageRating,
        punctualityRate,
        totalRounds: rounds.length,
        completedRounds: completedRounds.length,
        earlyTasksCount: earlyTasks.length,
        lateTasksCount: lateTasks.length,
        lateOver1hRate: punctualityTasks.length > 0 ? (lateTasksOver1h.length / punctualityTasks.length) * 100 : null,
        scanbacRate,
        forcedAddressRate,
        forcedContactlessRate,
        pendingTasks: pendingTasksList.length,
        missingTasks: missingTasksList.length,
        missingBacs: tasksWithMissingBacs.length,
        partialDeliveredTasks: partialDeliveredTasksList.length,
        redeliveries: redeliveriesList.length,
        failedDeliveryRate: tasks.length > 0 ? (failedTasks.length / tasks.length) * 100 : null,
        sensitiveDeliveries: sensitiveDeliveriesList.length,
        qualityAlerts: qualityAlertTasks.length,
        numberOfRatings,
        ratingRate,
      },
      top5StarDrivers,
      earlyTasks,
      lateTasks,
      lateTasksOver1h,
      failedTasksList: failedTasks,
      pendingTasksList,
      missingTasksList,
      tasksWithMissingBacs,
      partialDeliveredTasksList,
      redeliveriesList,
      sensitiveDeliveriesList,
      qualityAlertTasks,
      tasksByStatus,
      tasksByProgression,
      tasksOverTime,
      roundsByStatus,
      roundsOverTime,
      driverPerformance,
    };
}
