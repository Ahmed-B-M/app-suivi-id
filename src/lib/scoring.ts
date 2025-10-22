
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
  npsScore?: number | null;
}

/**
 * Calculates all performance stats for a given list of tasks.
 * @param tasks - The tasks performed by a single driver.
 * @returns A raw stats object, without the composite score.
 */
export function calculateRawDriverStats(name: string, tasks: Tache[]): Omit<DriverStats, 'score' | 'npsScore'> {
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
 * @returns A composite score between 0 and 100.
 */
export function calculateDriverScore(stats: Omit<DriverStats, 'score'>, maxCompletedTasks: number): number {
  // If the driver has no ratings or no completed tasks, their score is 0.
  if (stats.totalRatings < 1 || stats.completedTasks < 1) {
    return 0;
  }

  // Term 1: Rating (coeff 5)
  // Convert rating out of 5 to percentage, then apply coefficient.
  const ratingPct = (stats.averageRating ?? 0) / 5 * 100;
  const ratingTerm = ratingPct * 5;

  // Term 2: Punctuality (coeff 3)
  const punctualityTerm = (stats.punctualityRate ?? 0) * 3;

  // Term 3: Scanbac rate (coeff 1)
  const scanbacTerm = stats.scanbacRate ?? 0;

  // Term 4: Forced Address rate (inverted, coeff 1)
  const forcedAddressTerm = 100 - (stats.forcedAddressRate ?? 0);

  // Term 5: Forced Contactless rate (inverted, coeff 2)
  const forcedContactlessTerm = (100 - (stats.forcedContactlessRate ?? 0)) * 2;
  
  // Term 6: Volume of tasks (coeff 0.5)
  // Convert completed tasks to a percentage of the max
  const volumePct = maxCompletedTasks > 0 ? (stats.completedTasks / maxCompletedTasks) * 100 : 0;
  const volumeTerm = volumePct * 0.5;

  const totalNumerator =
    ratingTerm +
    punctualityTerm +
    scanbacTerm +
    forcedAddressTerm +
    forcedContactlessTerm +
    volumeTerm;
  
  // The denominator is the sum of all coefficients: 5 + 3 + 1 + 1 + 2 + 0.5 = 12.5
  const totalDenominator = 12.5;

  const score = totalNumerator / totalDenominator;
  
  // Ensure the score is within the 0-100 range.
  return Math.max(0, Math.min(100, score));
}
