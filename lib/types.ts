export type KingdomStat = {
  id: string;
  label: string;
  value: string;
  iconKey: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Requirement = {
  id: string;
  title: string;
  description: string;
  iconKey: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MediaItem = {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  videoId: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DkpColumnType = "number" | "percent" | "string";

export type DkpColumn = {
  key: string;
  label: string;
  type: DkpColumnType;
  sortable: boolean;
  order: number;
  native: boolean;
};

export type DkpRow = {
  id: string;
  rank: number;
  governorId: string;
  nickname: string;
  alliance: string;
} & Record<string, string | number | null | undefined>;

export type DkpListResponse = {
  columns: DkpColumn[];
  items: DkpRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  filters: { alliances: string[] };
  scan: {
    id: string;
    filename: string;
    uploadedAt: string;
    rowCount: number;
  } | null;
};

export type DkpQuery = {
  search?: string;
  alliance?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type ApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "archived";

export type SpendingTier =
  | "f2p"
  | "low"
  | "mid"
  | "high"
  | "whale"
  | "kraken";

/** Stage-aware scoring profile — drives pivot calibration. */
export type ScoringProfile = "lost-kingdom" | "season-of-conquest";

/**
 * Per-application percentile bands across the active cohort
 * (status in pending+approved). 0..1; null means the underlying
 * stat is null on the applicant (so they aren't ranked at all).
 */
export type AppPercentiles = {
  power: number | null;
  killPoints: number | null;
  deaths: number | null;
  maxValorPoints: number | null;
  cohort: number;
};

export type AppScreenshot = {
  url: string;
  pathname?: string;
  category?:
    | "account"
    | "commander"
    | "resource"
    | "dkp"
    | "verification"
    | "other";
  label?: string;
  size?: number;
  contentType?: string;
};

export type MigrationApplicationListItem = {
  id: string;
  governorId: string;
  nickname: string;
  currentKingdom: string;
  currentAlliance: string | null;
  power: string;
  killPoints: string;
  vipLevel: string;
  discordHandle: string;
  t4Kills: string | null;
  t5Kills: string | null;
  deaths: string | null;
  marches: number | null;
  hasScrolls: boolean;
  /// Account creation date (ISO timestamp) — derived by OCR from the
  /// applicant's starter Scout commander screen. Null if no Scout
  /// screenshot was provided or verification failed.
  accountBornAt: string | null;
  /// True iff at least one verification screenshot was OCR-confirmed
  /// as the Scout. False = applicant uploaded a different commander.
  scoutVerified: boolean;
  spendingTier: SpendingTier | null;
  scoringProfile: ScoringProfile | null;
  overallScore: number | null;
  /** Auto-derived tag slugs ("veteran", "f2p-hero", etc.). */
  tags: string[] | null;
  /** Officer-curated tag slugs. Free-form, separate from auto `tags`. */
  manualTags: string[] | null;
  /** Percentile bands across the active cohort. Null on archived/rejected. */
  percentiles: AppPercentiles | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  screenshots: AppScreenshot[];

  // Normalized numeric copies for sortability and range filters.
  powerN: number | null;
  killPointsN: number | null;
  t4KillsN: number | null;
  t5KillsN: number | null;
  deathsN: number | null;
  healedN: number | null;
  foodN: number | null;
  previousKvkDkpN: number | null;
  speedupsMinutes: number | null;

  // Lifetime KvK proxy.
  maxValorPointsN: number | null;
};

export type MigrationApplicationDetail = MigrationApplicationListItem & {
  t1Kills: string | null;
  t2Kills: string | null;
  t3Kills: string | null;
  resourcesGathered: string | null;

  food: string | null;
  wood: string | null;
  stone: string | null;
  gold: string | null;

  /// Profile screen — only Max valor (lifetime) is kept as a KvK proxy.
  maxValorPoints: string | null;

  speedupsUniversalMinutes: number | null;
  speedupsConstructionMinutes: number | null;
  speedupsResearchMinutes: number | null;
  speedupsTrainingMinutes: number | null;
  speedupsHealingMinutes: number | null;
  speedupsBreakdown: Record<string, string> | null;

  marches: number | null;
  equipmentSummary: Record<string, string> | null;
  previousKvkDkp: string | null;
  /// Per-KvK stats from a DKP-scan row, separate from the lifetime
  /// account-wide power/killPoints/etc. Null when no scan was uploaded
  /// or the matching column wasn't recognised.
  prevKvkKillPoints: string | null;
  prevKvkT4Kills: string | null;
  prevKvkT5Kills: string | null;
  prevKvkDeaths: string | null;
  prevKvkKillPointsN: number | null;
  prevKvkT4KillsN: number | null;
  prevKvkT5KillsN: number | null;
  prevKvkDeathsN: number | null;

  /// Snapshot of what OCR / DKP-lookup parsed at submit time, in
  /// normalized units (raw integers for stats, minutes for speedups).
  ocrAutofill: Record<string, number> | null;
  /// Server-computed verdict per watched field. "auto-edited" → drift
  /// >5% from the autofill (or applicant cleared a parsed value);
  /// "manual" → applicant typed a value but no autofill snapshot was
  /// recorded; null → within tolerance, no badge needed.
  driftFlags: Record<string, "auto-edited" | "manual" | null>;
  /// Server-computed last-KvK DKP using the active profile's weights
  /// (LK 10/20/50 vs SoC 10/30/80). Compare against the applicant-
  /// reported `previousKvkDkp` to surface fudged numbers. Null when no
  /// prevKvk* data was supplied.
  prevKvkDkpComputed: number | null;
  /// Profile the score was actually computed on — explicit override
  /// from `scoringProfile` if set, else age-based inference. Always
  /// present (server fills it).
  effectiveProfile: ScoringProfile;
  /// True iff `effectiveProfile` came from auto-inference (no manual
  /// override saved). When this is true AND profile is SoC, the
  /// admin UI locks the toggle — no point switching back to LK.
  profileAutoInferred: boolean;
  /// Per-component contribution to overallScore (recomputed on every
  /// admin GET). Used by the score-bar popover to explain why the
  /// applicant got the score they got.
  scoreBreakdown: {
    accountAge: number;
    vip: number;
    power: number;
    killPoints: number;
    deaths: number;
    valor: number;
    t5Kills: number;
    prevKvkDkp: number;
    spendingModifier: number;
    sanityPenalty: number;
  };
  activityHours: string | null;
  timezone: string | null;
  reason: string | null;
  adminNotes: string | null;
  blobCleanupAt: string | null;

  t1KillsN: number | null;
  t2KillsN: number | null;
  t3KillsN: number | null;
  resourcesGatheredN: number | null;
  woodN: number | null;
  stoneN: number | null;
  goldN: number | null;

  ocrRawText: string | null;
};

export type ApplicationsListResponse = {
  items: MigrationApplicationListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: Partial<Record<ApplicationStatus, number>>;
};

export type ApplicationsQuery = {
  status?: ApplicationStatus[];
  q?: string;
  kingdom?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  /** Score floor (0..100). Drops anyone below from the list. */
  scoreMin?: number;
  /** Tag-any-of filter. Repeated `tag` query param on the wire. */
  tags?: string[];
  /** Restrict to specific spending tiers. */
  spendingTiers?: SpendingTier[];
  /** Range filters in normalized numeric units (e.g. powerMin: 80_000_000). */
  powerMin?: number;
  powerMax?: number;
  killPointsMin?: number;
  killPointsMax?: number;
  t4KillsMin?: number;
  t5KillsMin?: number;
  foodMin?: number;
  woodMin?: number;
  stoneMin?: number;
  goldMin?: number;
  maxValorPointsMin?: number;
  marchesMin?: number;
  marchesMax?: number;
  hasScrolls?: boolean;
  /** ISO date range — application createdAt. */
  since?: string;
  until?: string;
};
