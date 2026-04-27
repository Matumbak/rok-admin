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
