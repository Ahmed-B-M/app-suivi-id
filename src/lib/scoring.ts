
export interface DriverStats {
  name: string;
  totalTasks: number;
  completedTasks: number;
  averageRating: number | null;
  punctualityRate: number | null;
  scanbacRate: number | null;
  forcedAddressRate: number | null;
  forcedContactlessRate: number | null;
  score?: number;
}

/**
 * Calculates a composite score for a driver based on a custom formula.
 * @param stats - The driver's performance statistics.
 * @param maxCompletedTasks - The maximum number of tasks completed by any single driver in the period.
 * @returns A composite score.
 */
export function calculateDriverScore(stats: Omit<DriverStats, 'score'>, maxCompletedTasks: number): number {
  if (stats.completedTasks < 5) {
    return 0; // Minimum 5 tasks to be scored
  }

  // 1. Rating term (coeff 3)
  const ratingPct = stats.averageRating ? (stats.averageRating / 5) * 100 : 0;
  const ratingTerm = ratingPct * 3;

  // 2. Punctuality term (coeff 2)
  const punctualityPct = stats.punctualityRate ?? 0;
  const punctualityTerm = punctualityPct * 2;

  // 3. Scanbac term (coeff 1)
  const scanbacPct = stats.scanbacRate ?? 0;

  // 4. Forced Address term (inverted)
  const forcedAddressInvertedPct = 100 - (stats.forcedAddressRate ?? 0);

  // 5. Forced Contactless term (inverted)
  const forcedContactlessInvertedPct = 100 - (stats.forcedContactlessRate ?? 0);
  
  // 6. Task volume term
  const volumePct = maxCompletedTasks > 0 ? (stats.completedTasks / maxCompletedTasks) * 100 : 0;

  const numerator = 
      ratingTerm + 
      punctualityTerm + 
      scanbacPct + 
      forcedAddressInvertedPct + 
      forcedContactlessInvertedPct + 
      volumePct;
      
  const score = numerator / 9;

  return Math.max(0, Math.min(100, score));
}
