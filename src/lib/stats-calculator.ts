
import { Tache, Tournee } from './types';
import { getDriverFullName, getDepotFromHub, getHubCategory } from './grouping';
import { differenceInMinutes, parseISO, addMinutes, subMinutes, differenceInHours } from 'date-fns';
import { calculateDriverScore, calculateRawDriverStats, DriverStats } from './scoring';

// --- Types ---
export interface DashboardStats {
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
}

export interface DashboardCalculatedStats {
  stats: DashboardStats;
  tasksByStatus: { name: string; value: number }[];
  tasksByProgression: { name: string; value: number }[];
  tasksOverTime: { date: string; count: number }[];
  roundsByStatus: { name: string; value: number }[];
  roundsOverTime: { date: string; count: number }[];
  top5StarDrivers: { name: string; fiveStarCount: number }[];
  earlyTasks: { task: Tache; minutes: number }[];
  lateTasks: { task: Tache; minutes: number }[];
  lateTasksOver1h: { task: Tache; minutes: number }[];
  failedTasksList: Tache[];
  pendingTasksList: Tache[];
  missingTasksList: Tache[];
  tasksWithMissingBacs: Tache[];
  partialDeliveredTasksList: Tache[];
  redeliveriesList: Tache[];
  sensitiveDeliveriesList: Tache[];
  qualityAlertTasks: Tache[];
  driverPerformance: DriverStats[];
  hasData: boolean;
}

export interface Deviation {
    round: Tournee;
    totalWeight: number;
    capacity: number;
    deviation: number;
}

export interface DeviationSummary {
    name: string;
    overloadRate: number;
    totalRounds: number;
}

export interface PunctualityIssue {
    task: Tache;
    plannedArriveTime: string;
    deviationMinutes: number;
}


export interface SummaryMetrics {
  name: string;
  totalRounds: number;
  punctualityRatePlanned: number | null;
  punctualityRateActual: number | null;
  overweightRoundsRate: number | null;
  mostFrequentTimeWindow: string;
  leastFrequentTimeWindow: string;
  mostLateTimeWindow: string;
  top3LatePostcodes: { postcode: string; count: number }[];
  avgTasksPer2Hours: number | null;
}


// --- Keywords for Categorization ---
const keywordCategories: Record<string, string[]> = {
  'Attitude livreur': ['agressif', 'impoli', 'pas aimable', 'dispute', 'attitude'],
  'Amabilité livreur': ['aimable', 'souriant', 'serviable', 'gentil', 'courtois'],
  'Casse produit': ['casse', 'abime', 'endommage', 'produit abîmé'],
  'Manquant produit': ['manquant', 'oubli', 'pas tout reçu', 'manque'],
  'Manquant multiple': ['plusieurs manquants', 'nombreux oublis'],
  'Manquant bac': ['bac manquant', 'bac non livré'],
  'Non livré': ['pas livre', 'non recu', 'jamais arrivé'],
  'Erreur de préparation': ['erreur prepa', 'mauvais produit', 'inversion'],
  'Erreur de livraison': ['mauvaise adresse', 'voisin'],
  'Livraison en avance': ['en avance', 'trop tot'],
  'Livraison en retard': ['en retard', 'trop tard', 'pas a lheure'],
  'Rupture chaine de froid': ['froid', 'chaîne du froid', 'decongele'],
  'Process': ['process', 'application', 'sms', 'appel'],
};


export const categories = [
  'Attitude livreur',
  'Amabilité livreur',
  'Casse produit',
  'Manquant produit',
  'Manquant multiple',
  'Manquant bac',
  'Non livré',
  'Erreur de préparation',
  'Erreur de livraison',
  'Livraison en avance',
  'Livraison en retard',
  'Rupture chaine de froid',
  'Process',
  'Non pertinent',
  'Autre',
] as const;

export function getCategoryFromKeywords(comment: string | null | undefined): typeof categories[number] {
    if (!comment) {
        return 'Autre';
    }
    const lowerCaseComment = comment.toLowerCase();
    for (const [category, keywords] of Object.entries(keywordCategories)) {
        if (keywords.some(keyword => lowerCaseComment.includes(keyword))) {
            return category as typeof categories[number];
        }
    }
    return 'Autre';
}


// --- Main Calculation Functions ---

export function calculateDashboardStats(tasks: Tache[], rounds: Tournee[]): DashboardCalculatedStats {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.progression === 'COMPLETED').length;
    const failedTasks = tasks.filter(t => ['FAILED', 'CANCELLED'].includes(t.progression ?? ''));

    const ratings = tasks.map(t => t.metaDonnees?.notationLivreur).filter((r): r is number => typeof r === 'number');
    const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    const completedWithTime = tasks.filter(t => t.progression === 'COMPLETED' && t.creneauHoraire?.debut && t.dateCloture);
    
    let punctualTasks = 0;
    const earlyTasks: { task: Tache, minutes: number }[] = [];
    const lateTasks: { task: Tache, minutes: number }[] = [];

    completedWithTime.forEach(t => {
      try {
        const closure = parseISO(t.dateCloture!);
        const windowStart = parseISO(t.creneauHoraire!.debut!);
        const windowEnd = t.creneauHoraire!.fin ? parseISO(t.creneauHoraire!.fin) : addMinutes(windowStart, 120);

        const diffStart = differenceInMinutes(closure, windowStart);
        const diffEnd = differenceInMinutes(closure, windowEnd);

        if (diffStart >= -15 && diffEnd <= 15) {
          punctualTasks++;
        } else if (diffStart < -15) {
          earlyTasks.push({ task: t, minutes: Math.abs(diffStart) });
        } else if (diffEnd > 15) {
          lateTasks.push({ task: t, minutes: diffEnd });
        }
      } catch (e) {
        // malformed date
      }
    });

    const punctualityRate = completedWithTime.length > 0 ? (punctualTasks / completedWithTime.length) * 100 : null;

    const tasksByStatus = tasks.reduce((acc, task) => {
        const status = task.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const tasksByProgression = tasks.reduce((acc, task) => {
        const progression = task.progression || 'Unknown';
        acc[progression] = (acc[progression] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

     const tasksOverTime = tasks.reduce((acc, task) => {
        const date = task.unplanned ? 'Unplanned' : (task.date ? task.date.split('T')[0] : 'Unknown');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const roundsByStatus = rounds.reduce((acc, round) => {
        const status = round.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const roundsOverTime = rounds.reduce((acc, round) => {
        const date = round.date ? round.date.split('T')[0] : 'Unknown';
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const fiveStarRatingsByDriver = tasks.reduce((acc, task) => {
        if (task.metaDonnees?.notationLivreur === 5) {
            const driverName = getDriverFullName(task);
            if (driverName) {
                acc[driverName] = (acc[driverName] || 0) + 1;
            }
        }
        return acc;
    }, {} as Record<string, number>);

    const top5StarDrivers = Object.entries(fiveStarRatingsByDriver)
        .map(([name, fiveStarCount]) => ({ name, fiveStarCount }))
        .sort((a, b) => b.fiveStarCount - a.fiveStarCount)
        .slice(0, 5);
    
    const tasksByDriver = tasks.reduce((acc, task) => {
        const driverName = getDriverFullName(task);
        if (driverName) {
            if (!acc[driverName]) acc[driverName] = [];
            acc[driverName].push(task);
        }
        return acc;
    }, {} as Record<string, Tache[]>);

    const driverStats = Object.entries(tasksByDriver).map(([name, driverTasks]) => {
        return calculateRawDriverStats(name, driverTasks);
    });

    const maxCompletedTasks = Math.max(0, ...driverStats.map(d => d.completedTasks));

    const driverPerformance = driverStats
        .map(stats => ({
            ...stats,
            score: calculateDriverScore(stats, maxCompletedTasks)
        }))
        .filter(d => d.totalRatings > 0);


    const sensitiveKeywords = ["fragile", "urgent", "ne pas", "laisser", "porte", "gardien"];
    const sensitiveDeliveriesList = tasks.filter(t => t.instructions && sensitiveKeywords.some(k => t.instructions!.toLowerCase().includes(k)));

    const qualityAlertTasks = tasks.filter(t => t.metaDonnees?.notationLivreur && t.metaDonnees.notationLivreur < 4);

    const stats: DashboardStats = {
        totalTasks,
        completedTasks,
        failedTasks: failedTasks.length,
        averageRating,
        punctualityRate,
        totalRounds: rounds.length,
        completedRounds: rounds.filter(r => r.status === 'COMPLETED').length,
        earlyTasksCount: earlyTasks.length,
        lateTasksCount: lateTasks.length,
        lateOver1hRate: lateTasks.length > 0 ? (lateTasks.filter(t => t.minutes > 60).length / lateTasks.length) * 100 : 0,
        scanbacRate: completedTasks > 0 ? (tasks.filter(t => t.completePar === 'mobile').length / completedTasks) * 100 : null,
        forcedAddressRate: completedTasks > 0 ? (tasks.filter(t => t.heureReelle?.arrivee?.adresseCorrecte === false).length / completedTasks) * 100 : null,
        forcedContactlessRate: completedTasks > 0 ? (tasks.filter(t => t.execution?.sansContact?.forced === true).length / completedTasks) * 100 : null,
        pendingTasks: tasksByProgression['PENDING'] || 0,
        missingTasks: tasksByStatus['MISSING'] || 0,
        missingBacs: tasks.filter(t => t.articles?.some(a => a.statut === 'MISSING')).length,
        partialDeliveredTasks: tasksByStatus['PARTIAL_DELIVERED'] || 0,
        redeliveries: tasks.filter(t => t.progression === 'FAILED' && (t.tentatives ?? 0) > 1).length,
        failedDeliveryRate: completedTasks > 0 ? (failedTasks.length / (completedTasks + failedTasks.length)) * 100 : 0,
        sensitiveDeliveries: sensitiveDeliveriesList.length,
        qualityAlerts: qualityAlertTasks.length,
        numberOfRatings: ratings.length,
        ratingRate: totalTasks > 0 ? (ratings.length / totalTasks) * 100 : null,
    };
    
    return {
        stats,
        tasksByStatus: Object.entries(tasksByStatus).map(([name, value]) => ({ name, value })),
        tasksByProgression: Object.entries(tasksByProgression).map(([name, value]) => ({ name, value })),
        tasksOverTime: Object.entries(tasksOverTime).map(([date, count]) => ({ date, count })),
        roundsByStatus: Object.entries(roundsByStatus).map(([name, value]) => ({ name, value })),
        roundsOverTime: Object.entries(roundsOverTime).map(([date, count]) => ({ date, count })),
        top5StarDrivers,
        earlyTasks,
        lateTasks,
        lateTasksOver1h: lateTasks.filter(t => t.minutes > 60),
        failedTasksList: failedTasks,
        pendingTasksList: tasks.filter(t => t.progression === 'PENDING'),
        missingTasksList: tasks.filter(t => t.status === 'MISSING'),
        tasksWithMissingBacs: tasks.filter(t => t.articles?.some(a => a.statut === 'MISSING')),
        partialDeliveredTasksList: tasks.filter(t => t.status === 'PARTIAL_DELIVERED'),
        redeliveriesList: tasks.filter(t => t.progression === 'FAILED' && (t.tentatives ?? 0) > 1),
        sensitiveDeliveriesList,
        qualityAlertTasks,
        driverPerformance,
        hasData: totalTasks > 0 || rounds.length > 0,
    };
}


export function calculateDeviations(tasks: Tache[], rounds: Tournee[]) {
    const tasksByRound = tasks.reduce((acc, task) => {
        if (task.nomTournee) {
            if (!acc[task.nomTournee]) acc[task.nomTournee] = [];
            acc[task.nomTournee].push(task);
        }
        return acc;
    }, {} as Record<string, Tache[]>);

    const deviations: Deviation[] = [];
    const punctualityIssues: PunctualityIssue[] = [];

    for (const round of rounds) {
        const capacity = round.vehicle?.dimensions?.poids;
        const roundTasks = tasksByRound[round.name || ''];

        if (capacity && roundTasks) {
            const totalWeight = roundTasks.reduce((sum, task) => sum + (task.dimensions?.poids || 0), 0);
            if (totalWeight > capacity) {
                deviations.push({
                    round,
                    totalWeight,
                    capacity,
                    deviation: totalWeight - capacity,
                });
            }
        }
        
        // Punctuality check
        const roundStops = round.stops?.filter(s => s.taskId && s.arriveTime).sort((a,b) => a.sequence! - b.sequence!);
        if (roundStops) {
            for (const stop of roundStops) {
                const task = tasks.find(t => t.tacheId === stop.taskId);
                 if (task?.creneauHoraire?.debut) {
                    try {
                        const plannedArrive = parseISO(stop.arriveTime!);
                        const windowStart = parseISO(task.creneauHoraire.debut);
                        const windowEnd = task.creneauHoraire.fin ? parseISO(task.creneauHoraire.fin) : addMinutes(windowStart, 120);

                        const lowerBound = subMinutes(windowStart, 15);
                        const upperBound = addMinutes(windowEnd, 15);
                       
                        if (plannedArrive < lowerBound || plannedArrive > upperBound) {
                            const deviationMinutes = differenceInMinutes(plannedArrive, plannedArrive < lowerBound ? windowStart : windowEnd);
                             punctualityIssues.push({
                                task,
                                plannedArriveTime: stop.arriveTime!,
                                deviationMinutes,
                            });
                        }
                    } catch (e) {
                         // malformed date
                    }
                }
            }
        }
    }
    
    deviations.sort((a,b) => b.deviation - a.deviation);

    const roundsByDepot: Record<string, Tournee[]> = {};
    const roundsByWarehouse: Record<string, Tournee[]> = {};

    for (const round of rounds) {
        if (!round.nomHub) continue;
        const depot = getDepotFromHub(round.nomHub);
        if (depot !== 'Magasin') {
            if (!roundsByDepot[depot]) roundsByDepot[depot] = [];
            roundsByDepot[depot].push(round);
        }
        if (!roundsByWarehouse[round.nomHub]) roundsByWarehouse[round.nomHub] = [];
        roundsByWarehouse[round.nomHub].push(round);
    }
    
    const createSummary = (roundsByName: Record<string, Tournee[]>): DeviationSummary[] => {
        return Object.entries(roundsByName).map(([name, roundList]) => {
            const overloaded = roundList.filter(r => deviations.some(d => d.round.id === r.id)).length;
            const total = roundList.length;
            return {
                name,
                totalRounds: total,
                overloadRate: total > 0 ? (overloaded / total) * 100 : 0,
            }
        }).sort((a,b) => b.overloadRate - a.overloadRate);
    };

    const depotSummary = createSummary(roundsByDepot);
    const warehouseSummary = createSummary(roundsByWarehouse);

    return { deviations, depotSummary, warehouseSummary, punctualityIssues };
}

interface QualityData {
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
  driverRankings: DriverStats[];
  alertData: AlertData[];
}

interface DepotQuality {
  name: string;
  totalRatings: number;
  totalAlerts: number;
  alertRate: number | null;
  averageRating: number | null;
  punctualityRate: number | null;
  scanbacRate: number | null;
  forcedAddressRate: number | null;
  forcedContactlessRate: number | null;
  score: number;
  carriers: CarrierQuality[];
}

interface CarrierQuality {
  name: string;
  totalRatings: number;
  totalAlerts: number;
  alertRate: number | null;
  averageRating: number | null;
  punctualityRate: number | null;
  scanbacRate: number | null;
  forcedAddressRate: number | null;
  forcedContactlessRate: number | null;
  score: number;
  drivers: DriverQuality[];
}

interface DriverQuality extends DriverStats {
  score: number;
}


export interface AlertData {
    name: string; // Depot name
    carriers: {
        name: string;
        drivers: {
            name: string;
            alertCount: number;
            totalRatings: number;
            averageRating: number | null;
            commentCategories: Record<string, number>;
        }[];
    }[];
}

export function calculateQualityStats(tasks: Tache[]): QualityData {
    const tasksByDriver = tasks.reduce((acc, task) => {
        const driverName = getDriverFullName(task);
        if (driverName) {
            if (!acc[driverName]) acc[driverName] = [];
            acc[driverName].push(task);
        }
        return acc;
    }, {} as Record<string, Tache[]>);

    const driverStats = Object.entries(tasksByDriver).map(([name, driverTasks]) => {
        return calculateRawDriverStats(name, driverTasks);
    });

    const maxCompletedTasks = Math.max(0, ...driverStats.map(d => d.completedTasks));

    const scoredDrivers = driverStats
        .map(stats => ({
            ...stats,
            score: calculateDriverScore(stats, maxCompletedTasks)
        }))
        .filter(d => d.totalRatings > 0);
    
    // Group by depot -> carrier -> driver
    const structure: Record<string, Record<string, DriverQuality[]>> = {};

    scoredDrivers.forEach(driver => {
        const driverTasks = tasksByDriver[driver.name];
        if (!driverTasks || driverTasks.length === 0) return;
        
        // Find the most frequent depot/carrier for this driver
        const assignments = driverTasks.reduce((acc, t) => {
            const depot = getDepotFromHub(t.nomHub);
            if (depot) acc[depot] = (acc[depot] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const mainDepot = Object.keys(assignments).sort((a,b) => assignments[b] - assignments[a])[0] || 'Inconnu';
        const carrier = getCarrierFromDriver(driver.name);

        if (!structure[mainDepot]) structure[mainDepot] = {};
        if (!structure[mainDepot][carrier]) structure[mainDepot][carrier] = [];
        structure[mainDepot][carrier].push(driver);
    });

    const aggregateStats = (drivers: DriverStats[]): Omit<CarrierQuality, 'name' | 'drivers'> => {
        const totalTasks = drivers.reduce((sum, d) => sum + d.totalTasks, 0);
        const completedTasks = drivers.reduce((sum, d) => sum + d.completedTasks, 0);
        const totalRatings = drivers.reduce((sum, d) => sum + d.totalRatings, 0);
        
        const weightedAvgRating = drivers.reduce((sum, d) => sum + (d.averageRating ?? 0) * d.totalRatings, 0);
        const weightedPunctuality = drivers.reduce((sum, d) => sum + (d.punctualityRate ?? 0) * d.completedTasks, 0);
        const weightedScanbac = drivers.reduce((sum, d) => sum + (d.scanbacRate ?? 0) * d.completedTasks, 0);
        const weightedForcedAddress = drivers.reduce((sum, d) => sum + (d.forcedAddressRate ?? 0) * d.completedTasks, 0);
        const weightedForcedContactless = drivers.reduce((sum, d) => sum + (d.forcedContactlessRate ?? 0) * d.completedTasks, 0);

        const alertDrivers = drivers.map(d => {
            const driverTasks = tasksByDriver[d.name];
            return driverTasks.filter(t => t.metaDonnees?.notationLivreur != null && t.metaDonnees.notationLivreur < 4).length;
        });
        const totalAlerts = alertDrivers.reduce((sum, count) => sum + count, 0);

        const rawAgg: Omit<DriverStats, 'name' | 'score'> = {
            totalTasks,
            completedTasks,
            totalRatings,
            averageRating: totalRatings > 0 ? weightedAvgRating / totalRatings : null,
            punctualityRate: completedTasks > 0 ? weightedPunctuality / completedTasks : null,
            scanbacRate: completedTasks > 0 ? weightedScanbac / completedTasks : null,
            forcedAddressRate: completedTasks > 0 ? weightedForcedAddress / completedTasks : null,
            forcedContactlessRate: completedTasks > 0 ? weightedForcedContactless / completedTasks : null,
        };

        return {
            ...rawAgg,
            totalAlerts,
            alertRate: totalRatings > 0 ? (totalAlerts / totalRatings) * 100 : 0,
            score: calculateDriverScore(rawAgg, maxCompletedTasks),
        };
    };

    const details: DepotQuality[] = Object.entries(structure).map(([depotName, carriers]) => {
        const carrierList: CarrierQuality[] = Object.entries(carriers).map(([carrierName, drivers]) => {
            return {
                name: carrierName,
                drivers: drivers.sort((a, b) => b.score - a.score),
                ...aggregateStats(drivers)
            };
        }).sort((a,b) => b.score - a.score);

        return {
            name: depotName,
            carriers: carrierList,
            ...aggregateStats(carrierList.flatMap(c => c.drivers))
        };
    }).sort((a,b) => b.score - a.score);

    const summary = aggregateStats(scoredDrivers);

    // Alert Recurrence Data
    const alertTasks = tasks.filter(t => t.metaDonnees?.notationLivreur != null && t.metaDonnees.notationLivreur < 4);
    const alertStructure: Record<string, Record<string, Record<string, Tache[]>>> = {};

    alertTasks.forEach(task => {
        const driverName = getDriverFullName(task);
        if (!driverName) return;

        const depot = getDepotFromHub(task.nomHub) || 'Inconnu';
        const carrier = getCarrierFromDriver(driverName);

        if (!alertStructure[depot]) alertStructure[depot] = {};
        if (!alertStructure[depot][carrier]) alertStructure[depot][carrier] = {};
        if (!alertStructure[depot][carrier][driverName]) alertStructure[depot][carrier][driverName] = [];
        alertStructure[depot][carrier][driverName].push(task);
    });

    const alertData: AlertData[] = Object.entries(alertStructure).map(([depotName, carriers]) => ({
        name: depotName,
        carriers: Object.entries(carriers).map(([carrierName, drivers]) => ({
            name: carrierName,
            drivers: Object.entries(drivers).map(([driverName, driverAlertTasks]) => {
                const driverAllTasks = tasksByDriver[driverName] || [];
                const allRatings = driverAllTasks.map(t => t.metaDonnees?.notationLivreur).filter((r): r is number => r != null);
                
                return {
                    name: driverName,
                    alertCount: driverAlertTasks.length,
                    totalRatings: allRatings.length,
                    averageRating: allRatings.length > 0 ? allRatings.reduce((a,b) => a+b, 0) / allRatings.length : null,
                    commentCategories: driverAlertTasks.reduce((acc, t) => {
                        const cat = getCategoryFromKeywords(t.metaDonnees!.commentaireLivreur);
                        acc[cat] = (acc[cat] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>)
                }
            }).sort((a, b) => b.alertCount - a.alertCount)
        })).sort((a,b) => b.drivers.reduce((s,d) => s + d.alertCount, 0) - a.drivers.reduce((s,d) => s + d.alertCount, 0))
    }));


    return {
        summary: {
            totalRatings: summary.totalRatings,
            totalAlerts: summary.totalAlerts,
            alertRate: summary.alertRate,
            averageRating: summary.averageRating,
            punctualityRate: summary.punctualityRate,
            scanbacRate: summary.scanbacRate,
            forcedAddressRate: summary.forcedAddressRate,
            forcedContactlessRate: summary.forcedContactlessRate,
            score: summary.score
        },
        details,
        driverRankings: scoredDrivers,
        alertData,
    };
}


export function calculateSummaryMetrics(tasks: Tache[], rounds: Tournee[]): { depotSummary: SummaryMetrics[], warehouseSummaryByDepot: Map<string, SummaryMetrics[]> } {
    const roundsByDepot: Record<string, Tournee[]> = {};
    const roundsByWarehouse: Record<string, Tournee[]> = {};

    rounds.forEach(round => {
        const depot = getDepotFromHub(round.nomHub);
        if (!roundsByDepot[depot]) roundsByDepot[depot] = [];
        roundsByDepot[depot].push(round);
        
        if (round.nomHub) {
            if (!roundsByWarehouse[round.nomHub]) roundsByWarehouse[round.nomHub] = [];
            roundsByWarehouse[round.nomHub].push(round);
        }
    });

    const tasksByRoundId: Record<string, Tache[]> = tasks.reduce((acc, task) => {
        const roundId = task.round;
        if (roundId) {
            if (!acc[roundId]) acc[roundId] = [];
            acc[roundId].push(task);
        }
        return acc;
    }, {} as Record<string, Tache[]>);

    const calculateMetricsForGroup = (name: string, groupRounds: Tournee[]): SummaryMetrics => {
        const groupTasks = groupRounds.flatMap(r => tasksByRoundId[r.id] || []);
        
        // Punctuality planned
        let plannedPunctualStops = 0;
        let totalPlannedStops = 0;
        const latePostcodes: string[] = [];

        groupRounds.forEach(round => {
            round.stops?.forEach(stop => {
                if (stop.arriveTime) {
                    totalPlannedStops++;
                    const task = tasks.find(t => t.tacheId === stop.taskId);
                    if (task?.creneauHoraire?.debut && task?.creneauHoraire?.fin) {
                        try {
                            const arrive = parseISO(stop.arriveTime);
                            const start = parseISO(task.creneauHoraire.debut);
                            const end = parseISO(task.creneauHoraire.fin);
                            if (arrive >= start && arrive <= end) {
                                plannedPunctualStops++;
                            } else if (arrive > end) {
                                if (task.localisation?.codePostal) {
                                    latePostcodes.push(task.localisation.codePostal);
                                }
                            }
                        } catch(e) { /* ignore invalid dates */ }
                    }
                }
            });
        });

        // Punctuality actual
        const actualCompletedTasks = groupTasks.filter(t => t.progression === 'COMPLETED' && t.creneauHoraire?.debut && t.dateCloture);
        let actualPunctualTasks = 0;
        actualCompletedTasks.forEach(task => {
             try {
                const closure = parseISO(task.dateCloture!);
                const start = parseISO(task.creneauHoraire!.debut!);
                const end = task.creneauHoraire!.fin ? parseISO(task.creneauHoraire!.fin) : addMinutes(start, 120);
                if (closure >= start && closure <= end) {
                    actualPunctualTasks++;
                }
            } catch(e) { /* ignore invalid dates */ }
        });
        
        // Overweight
        const { deviations } = calculateDeviations(groupTasks, groupRounds);
        const overweightRoundsRate = groupRounds.length > 0 ? (deviations.length / groupRounds.length) * 100 : null;

        // Time windows
        const timeWindowCounts = groupTasks.reduce((acc, task) => {
            if (task.creneauHoraire?.debut) {
                try {
                    const hour = parseISO(task.creneauHoraire.debut).getHours();
                    const window = `${hour}h-${hour+2}h`;
                    acc[window] = (acc[window] || 0) + 1;
                } catch(e) {/*ignore*/}
            }
            return acc;
        }, {} as Record<string, number>);
        const sortedWindows = Object.entries(timeWindowCounts).sort((a, b) => b[1] - a[1]);

        // Late time windows
        const lateTimeWindows = groupTasks.reduce((acc, task) => {
            if (task.progression === 'COMPLETED' && task.dateCloture && task.creneauHoraire?.fin) {
                try {
                    const closure = parseISO(task.dateCloture);
                    const end = parseISO(task.creneauHoraire.fin);
                    if (closure > end) {
                        const startHour = parseISO(task.creneauHoraire.debut!).getHours();
                        const window = `${startHour}h-${startHour+2}h`;
                        acc[window] = (acc[window] || 0) + 1;
                    }
                } catch(e) {/*ignore*/}
            }
            return acc;
        }, {} as Record<string, number>);
        const mostLateTimeWindow = Object.keys(lateTimeWindows).sort((a,b) => lateTimeWindows[b] - lateTimeWindows[a])[0] || 'N/A';

        // Late postcodes
        const postcodeCounts = latePostcodes.reduce((acc, pc) => {
            acc[pc] = (acc[pc] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const top3LatePostcodes = Object.entries(postcodeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([postcode, count]) => ({ postcode, count }));

        // Avg tasks per 2 hours
        const productiveHours = groupTasks.reduce((totalHours, task) => {
             if (task.tempsDeServiceReel?.duree && task.tempsDeServiceReel.duree > 0) {
                return totalHours + (task.tempsDeServiceReel.duree / 3600);
            }
             if (task.dateCreation && task.dateCloture) {
                try {
                    return totalHours + (differenceInHours(parseISO(task.dateCloture), parseISO(task.dateCreation)));
                } catch(e) { return totalHours; }
            }
            return totalHours;
        }, 0);
        
        const avgTasksPer2Hours = productiveHours > 0 ? (groupTasks.length / productiveHours) * 2 : null;

        return {
            name,
            totalRounds: groupRounds.length,
            punctualityRatePlanned: totalPlannedStops > 0 ? (plannedPunctualStops / totalPlannedStops) * 100 : null,
            punctualityRateActual: actualCompletedTasks.length > 0 ? (actualPunctualTasks / actualCompletedTasks.length) * 100 : null,
            overweightRoundsRate,
            mostFrequentTimeWindow: sortedWindows[0]?.[0] || 'N/A',
            leastFrequentTimeWindow: sortedWindows[sortedWindows.length-1]?.[0] || 'N/A',
            mostLateTimeWindow,
            top3LatePostcodes,
            avgTasksPer2Hours,
        };
    };

    const depotSummary = Object.entries(roundsByDepot).map(([name, groupRounds]) => 
        calculateMetricsForGroup(name, groupRounds)
    ).sort((a,b) => b.totalRounds - a.totalRounds);

    const warehouseSummaryByDepot = new Map<string, SummaryMetrics[]>();
    Object.entries(roundsByWarehouse).forEach(([whName, whRounds]) => {
        const depot = getDepotFromHub(whName);
        const metrics = calculateMetricsForGroup(whName, whRounds);
        if (!warehouseSummaryByDepot.has(depot)) {
            warehouseSummaryByDepot.set(depot, []);
        }
        warehouseSummaryByDepot.get(depot)!.push(metrics);
    });

    warehouseSummaryByDepot.forEach(summaries => summaries.sort((a,b) => b.totalRounds - a.totalRounds));
    
    return { depotSummary, warehouseSummaryByDepot };
}
