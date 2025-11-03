
import type { Tache, Tournee, NpsData, ProcessedNpsVerbatim } from "@/lib/types";
import { calculateRawDriverStats, calculateDriverScore } from "./scoring";
import { getDriverFullName, getHubCategory, getDepotFromHub } from "./grouping";
import { addMinutes, differenceInMinutes, parseISO, subMinutes } from "date-fns";
import type { CategorizedComment } from "@/hooks/use-pending-comments";

const FAILED_PROGRESSIONS = ['FAILED', 'CANCELLED'];
const FAILED_STATUSES = ['DELIVERY_FAILED', 'NOT_DELIVERED', 'CANCELLED', 'REJECTED'];

// Mots-clés pour les livraisons sensibles, en minuscules et sans accents pour une recherche plus large
const SENSITIVE_KEYWORDS = ["piece", "identite", "police", "gendarmerie", "caserne"];

/**
 * Normalise un texte en le passant en minuscules et en retirant les accents.
 * @param text - Le texte à normaliser.
 * @returns Le texte normalisé.
 */
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD") // Sépare les caractères et les accents
        .replace(/[\u0300-\u036f]/g, ""); // Retire les accents
}


/**
 * Categorizes a comment based on keywords.
 * @param comment - The customer comment string.
 * @returns The determined category.
 */
export function getCategoryFromKeywords(comment: string | undefined | null): string[] {
    if (!comment) {
      return ['Autre'];
    }
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
            return [category];
        }
    }
    
    return ['Autre'];
}


export function calculateDashboardStats(
    allTasks: Tache[], 
    allRounds: Tournee[], 
    allNegativeComments: CategorizedComment[],
    allNpsData: NpsData[],
    processedVerbatims: ProcessedNpsVerbatim[],
    filterType: 'tous' | 'magasin' | 'entrepot',
    selectedDepot: string,
    selectedStore: string
) {
    if (!allTasks || !allRounds) {
      return { hasData: false, stats: null };
    }

    // Apply depot/store filters for comparison page
    let tasks = allTasks;
    let rounds = allRounds;

    if (selectedDepot !== 'all') {
        tasks = tasks.filter(t => getDepotFromHub(t.nomHub) === selectedDepot);
        rounds = rounds.filter(r => getDepotFromHub(r.nomHub) === selectedDepot);
        allNegativeComments = allNegativeComments.filter(c => getDepotFromHub(c.nomHub) === selectedDepot);
        // This part needs refinement if we want to filter NPS and verbatims by depot too
    }
  
    const completedTasks = tasks.filter(t => t.progression === "COMPLETED");
    
    const failedTasks = tasks.filter(t => 
        (t.progression && FAILED_PROGRESSIONS.includes(t.progression.toUpperCase())) || 
        (t.status && FAILED_STATUSES.includes(t.status.toUpperCase()))
    );
    
    const ratedTasks = completedTasks.map(t => t.notationLivreur).filter((r): r is number => typeof r === 'number');
    const averageRating = ratedTasks.length > 0 ? ratedTasks.reduce((a, b) => a + b, 0) / ratedTasks.length : null;
    const numberOfRatings = ratedTasks.length;
    const ratingRate = completedTasks.length > 0 ? (numberOfRatings / completedTasks.length) * 100 : null;

    // --- Punctuality Calculation based on REAL closure time ---
    const punctualityTasks = completedTasks.filter(t => t.debutCreneauInitial && t.dateCloture);
    let punctualCount = 0;
    const earlyTasks: { task: Tache; minutes: number }[] = [];
    const lateTasks: { task: Tache; minutes: number }[] = [];
    const lateTasksOver1h: { task: Tache; minutes: number }[] = [];

    punctualityTasks.forEach(task => {
        try {
            const closureTime = parseISO(task.dateCloture as string);
            const windowStart = parseISO(task.debutCreneauInitial as string);
            // Default to a 2-hour window if 'fin' is not present
            const windowEnd = task.finCreneauInitial ? parseISO(task.finCreneauInitial as string) : addMinutes(windowStart, 120);

            const earlyLimit = subMinutes(windowStart, 15);
            const lateLimit = addMinutes(windowEnd, 15);
            
            if (closureTime < earlyLimit) {
                const minutesEarly = differenceInMinutes(earlyLimit, closureTime);
                earlyTasks.push({ task, minutes: minutesEarly });
            } else if (closureTime > lateLimit) {
                const minutesLate = differenceInMinutes(closureTime, lateLimit);
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
    // --- End of Real Punctuality Calculation ---

    const uniqueRoundIds = new Set(rounds.map(r => r.id));
    const totalRounds = uniqueRoundIds.size;
    const completedRounds = rounds.filter(r => r.statut === "COMPLETED");

    const scanbacRate = completedTasks.length > 0 ? (completedTasks.filter(t => t.completePar === 'mobile').length / completedTasks.length) * 100 : null;
    const webCompletedTasks = completedTasks.filter(t => t.completePar === 'web');
    
    const forcedAddressTasks = completedTasks.filter(t => t.surPlaceForce === true);
    const forcedAddressRate = completedTasks.length > 0 ? (forcedAddressTasks.length / completedTasks.length) * 100 : null;
    
    const forcedContactlessTasks = completedTasks.filter(t => t.sansContactForce === true);
    const forcedContactlessRate = completedTasks.length > 0 ? (forcedContactlessTasks.length / completedTasks.length) * 100 : null;

    const pendingTasksList = tasks.filter(t => t.status === 'PENDING');
    
    const tasksWithMissingBacs = tasks.flatMap(task => 
        (task.raw.articles ?? [])
          .filter((item: any) => item.status === 'MISSING')
          .map((item: any) => ({ task, bac: item }))
    );

    const redeliveriesList = tasks.filter(t => (t.tentatives ?? 0) >= 2);
    
    const sensitiveDeliveriesList = tasks.filter(task => {
        if (!task.instructions) return false;
        const normalizedInstructions = normalizeText(task.instructions);
        return SENSITIVE_KEYWORDS.some(keyword => normalizedInstructions.includes(keyword));
    });

    const partialDeliveredTasksList = tasks.filter(t => t.status === 'PARTIAL_DELIVERED');
    
    const qualityAlertTaskIds = new Set(allNegativeComments.map(c => c.taskId));
    const qualityAlertTasks = tasks.filter(t => qualityAlertTaskIds.has(t.tacheId));


    const alertRate = numberOfRatings > 0 ? (qualityAlertTasks.length / numberOfRatings) * 100 : null;

    const tasksByStatus = Object.entries(tasks.reduce((acc, task) => {
        const status = task.status || "Unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    const tasksByProgression = Object.entries(tasks.reduce((acc, task) => {
        const progression = task.progression || "Unknown";
        acc[progression] = (acc[progression] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    const tasksOverTime = Object.entries(tasks.reduce((acc, task) => {
      const dateKey = task.date ? new Date(task.date as string).toISOString().split('T')[0] : "Unplanned";
      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)).map(([date, count]) => ({ date, count }));

    const roundsByStatus = Object.entries(rounds.reduce((acc, round) => {
      const status = round.statut || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));
    
    const roundsOverTime = Object.entries(rounds.reduce((acc, round) => {
      const date = round.date ? new Date(round.date as string).toISOString().split('T')[0] : "Unknown";
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
            if (task.notationLivreur === 5) {
                const driverName = getDriverFullName(task);
                if (driverName) {
                    acc[driverName] = (acc[driverName] || 0) + 1;
                }
            }
            return acc;
        }, {} as Record<string, number>)
    ).map(([name, fiveStarCount]) => ({ name, fiveStarCount })).sort((a, b) => b.fiveStarCount - a.fiveStarCount).slice(0, 5);

    const hasData = tasks.length > 0 || rounds.length > 0;
    
    // --- Comment Analysis Logic ---
    const totalComments = allNegativeComments.length;
    
    const commentsByCategory = Object.entries(allNegativeComments.reduce((acc, comment) => {
        const categories = Array.isArray(comment.category) ? comment.category : [comment.category];
        categories.forEach(cat => {
             if(cat) acc[cat as string] = (acc[cat as string] || 0) + 1;
        });
        return acc;
    }, {} as Record<string, number>))
    .map(([category, count]) => ({
        category,
        count,
        percentage: totalComments > 0 ? (count / totalComments) * 100 : 0
    }))
    .sort((a,b) => b.count - a.count);

    const attitudeComments = allNegativeComments
      .filter(c => {
          const categories = Array.isArray(c.category) ? c.category : [c.category];
          return categories.includes('Attitude livreur');
      })
      .map(c => {
        const task = tasks.find(t => t.tacheId === c.taskId);
        return {
          comment: c.comment,
          driverName: c.driverName,
          taskDate: c.taskDate as string,
          roundName: task?.nomTournee
        };
    });
    // --- End Comment Analysis ---

    // --- NPS Calculation ---
    const filteredNpsVerbatims = allNpsData.flatMap(d => d.verbatims);
    
    const npsResponseCount = filteredNpsVerbatims.length;
    let nps: number | null = null;
    if (npsResponseCount > 0) {
        const promoterCount = filteredNpsVerbatims.filter(v => v.npsCategory === 'Promoter').length;
        const detractorCount = filteredNpsVerbatims.filter(v => v.npsCategory === 'Detractor').length;
        nps = ((promoterCount / npsResponseCount) - (detractorCount / npsResponseCount)) * 100;
    }

    const npsByCarrierData = Object.values(filteredNpsVerbatims.reduce((acc, v) => {
        const carrier = v.carrier || 'Inconnu';
        if (!acc[carrier]) {
            acc[carrier] = { name: carrier, promoters: 0, passives: 0, detractors: 0, total: 0 };
        }
        if (v.npsCategory === 'Promoter') acc[carrier].promoters++;
        else if (v.npsCategory === 'Passive') acc[carrier].passives++;
        else acc[carrier].detractors++;
        acc[carrier].total++;
        return acc;
    }, {} as Record<string, { name: string; promoters: number; passives: number; detractors: number; total: number; }>))
    .map(data => ({
        ...data,
        nps: data.total > 0 ? ((data.promoters / data.total) - (data.detractors / data.total)) * 100 : 0,
    })).sort((a, b) => b.nps - a.nps);

    // --- End NPS Calculation ---

    // --- Processed Verbatims Analysis ---
    const verbatimsToShow = processedVerbatims.filter(v => v.status === 'traité');

    const byCategoryMap: Record<string, number> = {};
    verbatimsToShow.forEach(v => {
        const categories = Array.isArray(v.category) ? v.category : (v.category ? [v.category] : []);
        categories.forEach(cat => {
            if (cat) byCategoryMap[cat] = (byCategoryMap[cat] || 0) + 1;
        });
    });
    const verbatimsByCategory = Object.entries(byCategoryMap)
        .map(([name, count]) => ({ name, count, percentage: verbatimsToShow.length > 0 ? (count / verbatimsToShow.length) * 100 : 0 }))
        .sort((a, b) => b.count - a.count);

    const byResponsibilityMap: Record<string, number> = {};
    verbatimsToShow.forEach(v => {
        const responsibilities = Array.isArray(v.responsibilities) ? v.responsibilities : (v.responsibilities ? [v.responsibilities] : []);
        const key = responsibilities.length > 0 ? [...new Set(responsibilities)].sort().join('/') : 'Inconnu';
        byResponsibilityMap[key] = (byResponsibilityMap[key] || 0) + 1;
    });
    const verbatimsByResponsibility = Object.entries(byResponsibilityMap)
        .map(([name, count]) => ({ name, count, percentage: verbatimsToShow.length > 0 ? (count / verbatimsToShow.length) * 100 : 0 }))
        .sort((a, b) => b.count - a.count);
    // --- End Processed Verbatims Analysis ---

    // --- Overload Calculations ---
    const WEIGHT_LIMIT = 1250; // kg
    const BACS_LIMIT = 105;

    const tasksDataByRound = new Map<string, { weight: number, bacs: number }>();
    tasks.forEach(task => {
        if (task.nomTournee && task.date && task.nomHub) {
            const roundKey = `${task.nomTournee}-${new Date(task.date as string).toISOString().split('T')[0]}-${task.nomHub}`;
            if (!tasksDataByRound.has(roundKey)) {
                tasksDataByRound.set(roundKey, { weight: 0, bacs: 0 });
            }
            const data = tasksDataByRound.get(roundKey)!;
            data.weight += task.poidsEnKg ?? 0;
            data.bacs += (task.raw.articles ?? []).filter((a:any) => a.type === 'BAC_SEC' || a.type === 'BAC_FRAIS').length;
        }
    });

    const overweightRoundsList: { round: Tournee, totalWeight: number, deviation: number }[] = [];
    const overbacsRoundsList: { round: Tournee, totalBacs: number, deviation: number }[] = [];

    rounds.forEach(round => {
        const roundKey = `${round.nom}-${new Date(round.date as string).toISOString().split('T')[0]}-${round.nomHub}`;
        const roundData = tasksDataByRound.get(roundKey);
        if (roundData) {
            if (roundData.weight > WEIGHT_LIMIT) {
                 overweightRoundsList.push({ 
                     round, 
                     totalWeight: roundData.weight,
                     deviation: roundData.weight - WEIGHT_LIMIT 
                });
            }
            if (roundData.bacs > BACS_LIMIT) {
                overbacsRoundsList.push({ 
                    round, 
                    totalBacs: roundData.bacs,
                    deviation: roundData.bacs - BACS_LIMIT
                });
            }
        }
    });

    // Sort by deviation descending
    overweightRoundsList.sort((a,b) => b.deviation - a.deviation);
    overbacsRoundsList.sort((a,b) => b.deviation - a.deviation);
    // --- End Overload Calculations ---


    return {
      hasData,
      stats: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        failedTasks: failedTasks.length,
        averageRating,
        punctualityRate,
        totalRounds,
        completedRounds: completedRounds.length,
        earlyTasksCount: earlyTasks.length,
        lateTasksCount: lateTasks.length,
        lateOver1hRate: punctualityTasks.length > 0 ? (lateTasksOver1h.length / punctualityTasks.length) * 100 : null,
        scanbacRate,
        forcedAddressRate,
        forcedContactlessRate,
        pendingTasks: pendingTasksList.length,
        missingTasks: tasks.filter(t => t.status === 'MISSING').length,
        missingBacs: tasksWithMissingBacs.length,
        partialDeliveredTasks: partialDeliveredTasksList.length,
        redeliveries: redeliveriesList.length,
        failedDeliveryRate: tasks.length > 0 ? (failedTasks.length / tasks.length) * 100 : null,
        sensitiveDeliveries: sensitiveDeliveriesList.length,
        qualityAlerts: qualityAlertTasks.length,
        numberOfRatings,
        ratingRate,
        alertRate,
        nps,
        npsResponseCount,
        overweightRounds: overweightRoundsList.length,
        overbacsRounds: overbacsRoundsList.length,
      },
      overweightRoundsList,
      overbacsRoundsList,
      completedRoundsList: completedRounds,
      npsByCarrier: npsByCarrierData,
      top5StarDrivers,
      earlyTasks,
      lateTasks,
      lateTasksOver1h,
      failedTasksList: failedTasks,
      pendingTasksList,
      missingTasksList: tasks.filter(t => t.status === 'MISSING'),
      tasksWithMissingBacs,
      partialDeliveredTasksList,
      redeliveriesList,
      sensitiveDeliveriesList,
      qualityAlertTasks,
      webCompletedTasks,
      forcedAddressTasks,
      forcedContactlessTasks,
      tasksByStatus,
      tasksByProgression,
      tasksOverTime,
      roundsByStatus,
      roundsOverTime,
      driverPerformance,
      commentAnalysis: {
        totalComments,
        commentsByCategory,
        attitudeComments,
      },
      verbatimAnalysis: {
        total: verbatimsToShow.length,
        byCategory: verbatimsByCategory,
        byResponsibility: verbatimsByResponsibility,
      }
    };
}

    