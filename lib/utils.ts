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

  // Group digits with non-breaking spaces. Locale-neutral on purpose —
  // formatted output looks the same regardless of the user's runtime
  // locale, and never line-breaks mid-number.
  const sign = n < 0 ? "-" : "";
  const grouped = Math.round(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return sign + grouped;
}

/**
 * Tag visual style table. Keep slugs in sync with rok-api/lib/scoring.ts —
 * if a slug isn't listed here it falls through to the default neutral
 * pill, which is fine but means we lose the colour signal.
 */
export type TagStyle = {
  label: string;
  className: string;
  /** True if this is officer-curated (rendered with extra outline). */
  manual?: boolean;
};

const TAG_STYLES: Record<string, TagStyle> = {
  veteran: {
    label: "Veteran",
    className: "border-emerald-500/60 text-emerald-300 bg-emerald-500/10",
  },
  "young-account": {
    label: "Young account",
    className: "border-sky-500/60 text-sky-300 bg-sky-500/10",
  },
  "very-young-account": {
    label: "Very young",
    className: "border-amber-500/60 text-amber-300 bg-amber-500/10",
  },
  "active-fighter": {
    label: "Active fighter",
    className: "border-emerald-500/60 text-emerald-300 bg-emerald-500/10",
  },
  turtle: {
    label: "Turtle",
    className: "border-amber-500/60 text-amber-300 bg-amber-500/10",
  },
  "kvk-veteran": {
    label: "KvK veteran",
    className: "border-emerald-500/60 text-emerald-300 bg-emerald-500/10",
  },
  "no-kvk": {
    label: "No KvK",
    className: "border-border-bronze/60 text-muted bg-background-deep/40",
  },
  "f2p-hero": {
    label: "F2P hero",
    className: "border-yellow-500/60 text-yellow-300 bg-yellow-500/10",
  },
  "pay-to-loose": {
    label: "Pay-to-loose",
    className: "border-red-500/60 text-red-300 bg-red-500/10",
  },
  "weak-whale": {
    label: "Weak whale",
    className: "border-red-500/60 text-red-300 bg-red-500/10",
  },
  "lk-veteran": {
    label: "LK veteran",
    className: "border-emerald-500/60 text-emerald-300 bg-emerald-500/10",
  },
  "t5-ready": {
    label: "T5 ready",
    className: "border-emerald-500/60 text-emerald-300 bg-emerald-500/10",
  },
  "pre-t5": {
    label: "Pre-T5",
    className: "border-amber-500/60 text-amber-300 bg-amber-500/10",
  },
  "t1-trader": {
    label: "T1 trader",
    className: "border-red-500/60 text-red-300 bg-red-500/15",
  },
  "mostly-low-tier": {
    label: "Low-tier heavy",
    className: "border-amber-500/60 text-amber-300 bg-amber-500/10",
  },
  "farm-only": {
    label: "Farm-only",
    className: "border-red-500/60 text-red-300 bg-red-500/10",
  },
  bunkerer: {
    label: "Bunkerer",
    className: "border-amber-500/60 text-amber-300 bg-amber-500/10",
  },
  dormant: {
    label: "Dormant",
    className: "border-amber-500/60 text-amber-300 bg-amber-500/10",
  },
  f2p: {
    label: "F2P",
    className: "border-border-bronze/60 text-muted bg-background-deep/40",
  },
  "lo-spend": {
    label: "Lo-spend",
    className: "border-border-bronze/60 text-muted bg-background-deep/40",
  },
  "mid-spend": {
    label: "Mid-spend",
    className: "border-amber-500/40 text-amber-200 bg-amber-500/10",
  },
  "hi-spend": {
    label: "Hi-spend",
    className: "border-orange-500/60 text-orange-300 bg-orange-500/10",
  },
  whale: {
    label: "Whale",
    className: "border-purple-500/60 text-purple-300 bg-purple-500/10",
  },
  kraken: {
    label: "Kraken",
    className: "border-fuchsia-500/60 text-fuchsia-300 bg-fuchsia-500/10",
  },
};

export function tagStyle(slug: string, isManual = false): TagStyle {
  const known = TAG_STYLES[slug];
  if (known) return { ...known, manual: isManual };
  return {
    label: slug,
    className: "border-border-bronze/60 text-foreground bg-background-deep/40",
    manual: isManual,
  };
}

/**
 * Percentile-band style for the small pill rendered next to a stat value.
 * Returns null when the applicant is in the unremarkable middle (under
 * the 50th percentile or null) — caller should render nothing in that
 * case.
 */
export function percentileBadge(
  pct: number | null | undefined,
): { label: string; className: string } | null {
  if (pct == null || !Number.isFinite(pct)) return null;
  if (pct >= 0.99)
    return {
      label: "Top 1%",
      className: "border-yellow-500/60 text-yellow-300 bg-yellow-500/15",
    };
  if (pct >= 0.95)
    return {
      label: "Top 5%",
      className: "border-orange-500/60 text-orange-300 bg-orange-500/15",
    };
  if (pct >= 0.75)
    return {
      label: "Top 25%",
      className: "border-emerald-500/60 text-emerald-300 bg-emerald-500/15",
    };
  if (pct >= 0.5)
    return {
      label: "Top 50%",
      className: "border-sky-500/60 text-sky-300 bg-sky-500/15",
    };
  return null;
}
