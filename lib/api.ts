"use client";

import type {
  ApplicationsListResponse,
  ApplicationsQuery,
  DkpListResponse,
  DkpQuery,
  KingdomStat,
  MediaItem,
  MigrationApplicationDetail,
  Requirement,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "rok-admin-token";

export const tokenStorage = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  set(t: string) {
    localStorage.setItem(TOKEN_KEY, t);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  { auth = false }: { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (auth) {
    const t = tokenStorage.get();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error ?? body?.message ?? `HTTP ${res.status}`,
      body,
    );
  }
  return body as T;
}

export { ApiError };

// ── Kingdom stats ─────────────────────────────────────────
export const kingdomStatsApi = {
  listAdmin: () =>
    request<{ items: KingdomStat[] }>(
      "/api/kingdom-stats/admin",
      { method: "GET" },
      { auth: true },
    ),
  create: (data: Partial<KingdomStat>) =>
    request<KingdomStat>(
      "/api/kingdom-stats",
      { method: "POST", body: JSON.stringify(data) },
      { auth: true },
    ),
  update: (id: string, data: Partial<KingdomStat>) =>
    request<KingdomStat>(
      `/api/kingdom-stats/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
      { auth: true },
    ),
  remove: (id: string) =>
    request<void>(
      `/api/kingdom-stats/${id}`,
      { method: "DELETE" },
      { auth: true },
    ),
};

// ── Requirements ──────────────────────────────────────────
export const requirementsApi = {
  listAdmin: () =>
    request<{ items: Requirement[] }>(
      "/api/requirements/admin",
      { method: "GET" },
      { auth: true },
    ),
  create: (data: Partial<Requirement>) =>
    request<Requirement>(
      "/api/requirements",
      { method: "POST", body: JSON.stringify(data) },
      { auth: true },
    ),
  update: (id: string, data: Partial<Requirement>) =>
    request<Requirement>(
      `/api/requirements/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
      { auth: true },
    ),
  remove: (id: string) =>
    request<void>(
      `/api/requirements/${id}`,
      { method: "DELETE" },
      { auth: true },
    ),
};

// ── Media ─────────────────────────────────────────────────
export const mediaApi = {
  listAdmin: () =>
    request<{ items: MediaItem[] }>(
      "/api/media/admin",
      { method: "GET" },
      { auth: true },
    ),
  create: (data: { url: string; title?: string; order?: number; active?: boolean }) =>
    request<MediaItem>(
      "/api/media",
      { method: "POST", body: JSON.stringify(data) },
      { auth: true },
    ),
  update: (id: string, data: Partial<MediaItem>) =>
    request<MediaItem>(
      `/api/media/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
      { auth: true },
    ),
  refreshTitles: () =>
    request<{ refreshed: number; total: number }>(
      "/api/media/refresh-titles",
      { method: "POST" },
      { auth: true },
    ),
  remove: (id: string) =>
    request<void>(`/api/media/${id}`, { method: "DELETE" }, { auth: true }),
};

// ── DKP ───────────────────────────────────────────────────
export const dkpApi = {
  list: (query: DkpQuery = {}) => {
    const qs = new URLSearchParams();
    if (query.search) qs.set("search", query.search);
    if (query.alliance) qs.set("alliance", query.alliance);
    if (query.sortBy) qs.set("sortBy", query.sortBy);
    if (query.sortOrder) qs.set("sortOrder", query.sortOrder);
    if (query.page) qs.set("page", String(query.page));
    if (query.pageSize) qs.set("pageSize", String(query.pageSize));
    const qsStr = qs.toString();
    return request<DkpListResponse>(
      `/api/dkp${qsStr ? `?${qsStr}` : ""}`,
      { method: "GET" },
    );
  },

  upload: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const t = tokenStorage.get();
    const res = await fetch(`${API_URL}/api/dkp/upload`, {
      method: "POST",
      headers: t ? { Authorization: `Bearer ${t}` } : undefined,
      body: fd,
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new ApiError(
        res.status,
        body?.error ?? `HTTP ${res.status}`,
        body,
      );
    }
    return body as {
      replaced: number;
      columns: string[];
      filename: string;
    };
  },

  clearAll: () =>
    request<{ deleted: number }>(
      "/api/dkp",
      { method: "DELETE" },
      { auth: true },
    ),
};

// ── Migration applications ───────────────────────────────
export const applicationsApi = {
  list: (query: ApplicationsQuery = {}) => {
    const qs = new URLSearchParams();
    if (query.status && query.status.length > 0)
      qs.set("status", query.status.join(","));
    if (query.q) qs.set("q", query.q);
    if (query.kingdom) qs.set("kingdom", query.kingdom);
    if (query.sortBy) qs.set("sortBy", query.sortBy);
    if (query.sortDir) qs.set("sortDir", query.sortDir);
    if (query.page) qs.set("page", String(query.page));
    if (query.pageSize) qs.set("pageSize", String(query.pageSize));
    if (query.powerMin != null) qs.set("powerMin", String(query.powerMin));
    if (query.powerMax != null) qs.set("powerMax", String(query.powerMax));
    if (query.killPointsMin != null)
      qs.set("killPointsMin", String(query.killPointsMin));
    if (query.killPointsMax != null)
      qs.set("killPointsMax", String(query.killPointsMax));
    if (query.t4KillsMin != null) qs.set("t4KillsMin", String(query.t4KillsMin));
    if (query.t5KillsMin != null) qs.set("t5KillsMin", String(query.t5KillsMin));
    if (query.maxValorPointsMin != null)
      qs.set("maxValorPointsMin", String(query.maxValorPointsMin));
    if (query.marchesMin != null) qs.set("marchesMin", String(query.marchesMin));
    if (query.marchesMax != null) qs.set("marchesMax", String(query.marchesMax));
    if (query.since) qs.set("since", query.since);
    if (query.until) qs.set("until", query.until);
    if (query.hasScrolls) qs.set("hasScrolls", "true");
    if (query.scoreMin != null) qs.set("scoreMin", String(query.scoreMin));
    for (const t of query.tags ?? []) qs.append("tag", t);
    if (query.spendingTiers && query.spendingTiers.length > 0)
      qs.set("spendingTier", query.spendingTiers.join(","));
    const qsStr = qs.toString();
    return request<ApplicationsListResponse>(
      `/api/migration-applications/admin${qsStr ? `?${qsStr}` : ""}`,
      { method: "GET" },
      { auth: true },
    );
  },

  detail: (id: string) =>
    request<MigrationApplicationDetail>(
      `/api/migration-applications/${id}/admin`,
      { method: "GET" },
      { auth: true },
    ),

  patch: (id: string, data: Partial<MigrationApplicationDetail>) =>
    request<MigrationApplicationDetail>(
      `/api/migration-applications/${id}/admin`,
      { method: "PATCH", body: JSON.stringify(data) },
      { auth: true },
    ),

  remove: (id: string) =>
    request<{ deleted: true }>(
      `/api/migration-applications/${id}/admin`,
      { method: "DELETE" },
      { auth: true },
    ),
};

export const checkAuth = async (): Promise<boolean> => {
  try {
    await requirementsApi.listAdmin();
    return true;
  } catch {
    return false;
  }
};
