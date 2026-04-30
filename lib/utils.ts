import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Display a normalized RoK number compactly: 84_200_000 → "84.2M".
 * Used in the migration-applications table where space is tight.
 */
export function formatRokNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2).replace(/\.?0+$/, "")}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2).replace(/\.?0+$/, "")}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.?0+$/, "")}K`;
  return String(Math.round(n));
}
