import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Display a normalized RoK number in the smallest faithful form:
 *
 *   2_200_000_000   → "2.2B"             (round-trips at 1 decimal)
 *   2_215_184_198   → "2 215 184 198"    (no clean abbreviation; show full)
 *   84_000_000      → "84M"
 *   84_200_000      → "84.2M"
 *   1_500           → "1.5K"
 *   1_234           → "1 234"
 *
 * Strategy: try abbreviating at the largest applicable unit (T/B/M/K) at
 * 0, 1, then 2 decimal places. Accept the abbreviation only if it
 * round-trips back to the original integer (within FP tolerance). If it
 * never does, fall through to a digit-grouped string with non-breaking
 * thousand separators, so the actual figure isn't lost on screen.
 */
export function formatRokNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n === 0) return "0";

  const abs = Math.abs(n);
  const units: Array<readonly [string, number]> = [
    ["T", 1e12],
    ["B", 1e9],
    ["M", 1e6],
    ["K", 1e3],
  ];

  for (const [letter, unit] of units) {
    if (abs < unit) continue;
    for (const decimals of [0, 1, 2]) {
      const factor = 10 ** decimals;
      const rounded = Math.round((n / unit) * factor) / factor;
      // FP-tolerant equality for round-trip check (n is always integer
      // for normalized RoK values, so 0.5 is plenty of slack).
      if (Math.abs(rounded * unit - n) < 0.5) {
        const str =
          decimals === 0
            ? String(rounded)
            : rounded.toFixed(decimals).replace(/\.?0+$/, "");
        return `${str}${letter}`;
      }
    }
    break; // Largest unit didn't round-trip — don't try smaller ones.
  }

  // Group digits with non-breaking spaces so the value never line-breaks.
  return Math.round(n).toLocaleString("ru-RU");
}
