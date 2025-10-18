import { addMinutes, differenceInMinutes, subMinutes } from "date-fns";
import { Tache } from "./types";

export interface DriverStats {
  name: string;
  totalTasks: number;
  completedTasks: number;
  totalRatings: number;
  averageRating: number | null;
  punctualityRate: number | null;
  scanbacRate: number | null;
  forcedAddressRate: number | null;
  forcedContactlessRate: number | null;
  score?: number;
}

/**
 * Calculates all performance stats for a given list of tasks.
 * @param tasks - The tasks performed by a single driver.
 * @returns A raw stats object, without the composite score.
 */
export function calculateRawDriverStats(name: string, tasks: Tache[]): Omit<DriverStats, 'score'> {
  const completed = tasks.filter(t => t.progression === 'COMPLETED');
  const rated = completed.map(t => t.metaDonnees?.notationLivreur).filter((r): r is number => typeof r === 'number');

  const completedWithTime = completed.filter(t => t.creneauHoraire?.debut && t.dateCloture);
  let punctual = 0;
  completedWithTime.forEach(t => {
    try {
      const closure = new Date(t.dateCloture!);
      const windowStart = new Date(t.creneauHoraire!.debut!);
      // Default to a 2-hour window if 'fin' is not present
      const windowEnd = t.creneauHoraire!.fin ? new Date(t.creneauHoraire!.fin) : addMinutes(windowStart, 120);

      // Check if inside the tolerance window
      const lowerBound = subMinutes(windowStart, 15);
      const upperBound = addMinutes(windowEnd, 15);
      
      if (closure >= lowerBound && closure <= upperBound) {
        punctual++;
      }
    } catch (e) {
      // Ignore tasks with invalid dates
    }
  });

  return {
    name,
    totalTasks: tasks.length,
    completedTasks: completed.length,
    totalRatings: rated.length,
    averageRating: rated.length > 0 ? rated.reduce((a, b) => a + b, 0) / rated.length : null,
    punctualityRate: completedWithTime.length > 0 ? (punctual / completedWithTime.length) * 100 : null,
    scanbacRate: completed.length > 0 ? (completed.filter(t => t.completePar === 'mobile').length / completed.length) * 100 : null,
    forcedAddressRate: completed.length > 0 ? (completed.filter(t => t.heureReelle?.arrivee?.adresseCorrecte === false).length / completed.length) * 100 : null,
    forcedContactlessRate: completed.length > 0 ? (completed.filter(t => t.execution?.sansContact?.forced === true).length / completed.length) * 100 : null,
  };
}


/**
 * Calculates a composite score for a driver based on a custom formula.
 * @param stats - The driver's performance statistics.
 * @param maxCompletedTasks - The maximum number of tasks completed by any single driver in the period.
 * @returns A composite score.
 */
export function calculateDriverScore(stats: Omit<DriverStats, 'score'>, maxCompletedTasks: number): number {
  if (stats.completedTasks < 1 || stats.totalRatings < 1) {
    return 0;
  }

  // 1. Rating term (coeff 3)
  const ratingPct = stats.averageRating ? (stats.averageRating / 5) * 100 : 0;
  const ratingTerm = ratingPct * 3;

  // 2. Punctuality term (coeff 2)
  const punctualityPct = stats.punctualityRate ?? 0;
  const punctualityTerm = punctualityPct * 2;

  // 3. Scanbac term (coeff 1)
  const scanbacPct = stats.scanbacRate ?? 0;

  // 4. Forced Address term (inverted, coeff 1)
  const forcedAddressInvertedPct = 100 - (stats.forcedAddressRate ?? 0);

  // 5. Forced Contactless term (inverted, coeff 1)
  const forcedContactlessInvertedPct = 100 - (stats.forcedContactlessRate ?? 0);
  
  const qualityNumerator = 
      ratingTerm + 
      punctualityTerm + 
      scanbacPct + 
      forcedAddressInvertedPct + 
      forcedContactlessInvertedPct;
      
  const qualityScore = qualityNumerator / 8; // (3+2+1+1+1)

  // Volume weighting factor: starts low and scales up to 1.
  // This means a driver with few tasks can still get a good score based on quality,
  // but the score is more "trusted" for drivers with more tasks.
  // Using a soft-cap approach: Math.min(stats.completedTasks, 50) / 50
  const volumeWeight = Math.min(stats.completedTasks, 50) / 50;

  // Final score is a mix of quality and volume confidence
  const score = qualityScore * volumeWeight;

  return Math.max(0, Math.min(100, score));
}
