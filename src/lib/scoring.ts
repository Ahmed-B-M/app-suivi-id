export interface DriverStats {
  name: string;
  totalTasks: number;
  completedTasks: number;
  averageRating: number | null;
  punctualityRate: number | null;
  scanbacRate: number | null;
  forcedAddressRate: number | null;
  forcedContactlessRate: number | null;
}

const WEIGHTS = {
  RATING: 0.3,
  PUNCTUALITY: 0.2,
  SCANBAC: 0.2,
  FORCED_ADDRESS: 0.1,
  FORCED_CONTACTLESS: 0.1,
  TASK_VOLUME_BONUS: 0.1,
};

/**
 * Calculates a composite score for a driver based on multiple performance metrics.
 * @param stats - The driver's performance statistics.
 * @returns A composite score from 0 to 100.
 */
export function calculateDriverScore(stats: DriverStats): number {
  if (stats.completedTasks === 0) {
    return 0;
  }

  // --- Normalize each metric to a 0-1 scale ---

  // Rating: Scale 1-5 to 0-1
  const ratingScore = stats.averageRating ? (stats.averageRating - 1) / 4 : 0;

  // Punctuality: Percentage to 0-1
  const punctualityScore = stats.punctualityRate !== null ? stats.punctualityRate / 100 : 0;

  // Scanbac: Percentage to 0-1
  const scanbacScore = stats.scanbacRate !== null ? stats.scanbacRate / 100 : 0;

  // Forced Rates (lower is better): Invert the percentage
  const forcedAddressScore = stats.forcedAddressRate !== null ? 1 - (stats.forcedAddressRate / 100) : 1;
  const forcedContactlessScore = stats.forcedContactlessRate !== null ? 1 - (stats.forcedContactlessRate / 100) : 1;
  
  // --- Apply weights ---

  let totalScore = 
      ratingScore * WEIGHTS.RATING +
      punctualityScore * WEIGHTS.PUNCTUALITY +
      scanbacScore * WEIGHTS.SCANBAC +
      forcedAddressScore * WEIGHTS.FORCED_ADDRESS +
      forcedContactlessScore * WEIGHTS.FORCED_CONTACTLESS;

  // --- Apply a bonus for volume, capped to prevent overpowering other metrics ---
  // The bonus gives a slight edge to more experienced drivers.
  // Using Math.log helps to flatten the curve, so the bonus for going from 10 to 100 tasks
  // is greater than going from 900 to 1000 tasks.
  const volumeBonus = Math.min(
    (Math.log(stats.completedTasks + 1) / Math.log(100)) * WEIGHTS.TASK_VOLUME_BONUS,
    WEIGHTS.TASK_VOLUME_BONUS
  );

  totalScore += volumeBonus;

  // Normalize the final score to be out of 100
  const maxPossibleScore = Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  
  return Math.max(0, Math.min(100, (totalScore / maxPossibleScore) * 100));
}
