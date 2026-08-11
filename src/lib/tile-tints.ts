/**
 * Soft pastel tint classes for icon tiles — used on the project hub's module
 * grid so each module gets its own colour identity instead of every icon
 * sitting in the same uniform grey square. Cycle through by array index
 * (`tileTint(i)`) so a fixed page layout gets a stable, varied look without
 * hand-picking a colour per module.
 */
const TILE_TINTS = [
  "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400",
  "bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400",
  "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400",
  "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  "bg-lime-50 text-lime-600 dark:bg-lime-500/10 dark:text-lime-400",
  "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
];

export function tileTint(index: number): string {
  return TILE_TINTS[index % TILE_TINTS.length];
}
