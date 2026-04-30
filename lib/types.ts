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

export type AppScreenshot = {
  url: string;
  pathname?: string;
  category?: "account" | "commander" | "resource" | "dkp" | "other";
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
