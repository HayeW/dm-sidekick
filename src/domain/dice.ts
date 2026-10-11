/**
 * A source of random numbers in [0, 1), like `Math.random`. Injectable so that tests can
 * use fixed values and stay deterministic.
 */
export type RandomSource = () => number;

/** Rolls one twenty-sided die: a whole number from 1 to 20. */
export function rollD20(random: RandomSource): number {
  return Math.floor(random() * 20) + 1;
}
