"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { applicationsApi } from "@/lib/api";
import {
  ApplicationsListResponse,
  ApplicationStatus,
  ApplicationsQuery,
  MigrationApplicationListItem,
} from "@/lib/types";
import { Button, Input, PageHeader, Toast } from "@/components/ui";
import { cn, formatRokNumber, tagStyle } from "@/lib/utils";

const STATUSES: ApplicationStatus[] = [
  "pending",
  "approved",
  "rejected",
  "archived",
];

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending: "border-amber-500/60 text-amber-300 bg-amber-500/10",
  approved: "border-emerald-500/60 text-emerald-300 bg-emerald-500/10",
  rejected: "border-red-500/60 text-red-300 bg-red-500/10",
  archived: "border-border-bronze/60 text-muted bg-background-deep/40",
};

const SORTABLE = new Set([
  "createdAt",
  "updatedAt",
  "reviewedAt",
  "nickname",
  "governorId",
  "currentKingdom",
  "status",
  "power",
  "killPoints",
  "t4Kills",
  "t5Kills",
  "deaths",
  "healed",
  "food",
  "previousKvkDkp",
  "speedupsMinutes",
  "overallScore",
  "accountBornAt",
]);

export default function ApplicationsPage() {
  const [data, setData] = React.useState<ApplicationsListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [statusFilter, setStatusFilter] = React.useState<
    Set<ApplicationStatus>
  >(() => new Set(["pending"]));
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [sortBy, setSortBy] = React.useState("createdAt");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [toast, setToast] = React.useState<string | null>(null);
  const [powerMin, setPowerMin] = React.useState("");
  const [kpMin, setKpMin] = React.useState("");
  const [maxValorMin, setMaxValorMin] = React.useState("");
  const [marchesMin, setMarchesMin] = React.useState("");
  const [kingdom, setKingdom] = React.useState("");
  const [since, setSince] = React.useState("");
  const [scrollsOnly, setScrollsOnly] = React.useState(false);
  const [scoreMin, setScoreMin] = React.useState("");
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  /**
   * Convert "84M" / "1.2B" / "84,000,000" into a Float matching the
   * server's normalization. Mirrors `parseRokNumber` from rok-api but
   * lives here because admin imports nothing from api/.
   */
  const parseRokInput = (v: string): number | null => {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const m = trimmed.match(/^(-?\d+(?:[.,]\d+)?)\s*([KMBGT])?$/i);
    if (!m) {
      const plain = Number.parseFloat(trimmed.replace(/[\s,]/g, ""));
      return Number.isFinite(plain) ? plain : null;
    }
    const base = Number.parseFloat(m[1].replace(",", "."));
    const suffix = m[2]?.toUpperCase();
    const mult =
      suffix === "K" ? 1e3 : suffix === "M" ? 1e6 : suffix === "B" || suffix === "G" ? 1e9 : suffix === "T" ? 1e12 : 1;
    return Number.isFinite(base) ? base * mult : null;
  };

  // Debounce search.
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever filters change.
  React.useEffect(() => {
    setPage(1);
  }, [
    statusFilter,
    debounced,
    sortBy,
    sortDir,
    powerMin,
    kpMin,
    maxValorMin,
    marchesMin,
    kingdom,
    since,
    scrollsOnly,
    scoreMin,
  ]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: ApplicationsQuery = {
        status: Array.from(statusFilter),
        q: debounced || undefined,
        sortBy,
        sortDir,
        page,
        pageSize: 25,
        powerMin: parseRokInput(powerMin) ?? undefined,
        killPointsMin: parseRokInput(kpMin) ?? undefined,
        maxValorPointsMin: parseRokInput(maxValorMin) ?? undefined,
        marchesMin: marchesMin
          ? Number.parseInt(marchesMin, 10) || undefined
          : undefined,
        kingdom: kingdom.trim() || undefined,
        since: since || undefined,
        hasScrolls: scrollsOnly || undefined,
        scoreMin: scoreMin
          ? Number.parseFloat(scoreMin) || undefined
          : undefined,
      };
      const res = await applicationsApi.list(query);
      setData(res);
    } catch (e) {
      setError((e as Error).message ?? "load_failed");
    } finally {
      setLoading(false);
    }
  }, [
    statusFilter,
    debounced,
    sortBy,
    sortDir,
    page,
    powerMin,
    kpMin,
    maxValorMin,
    marchesMin,
    kingdom,
    since,
    scrollsOnly,
    scoreMin,
  ]);

  React.useEffect(() => {
    load();
  }, [load]);

  const toggleSort = (col: string) => {
    if (!SORTABLE.has(col)) return;
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const toggleStatus = (s: ApplicationStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const counts = data?.counts ?? {};

  return (
    <>
      <PageHeader
        title="Migration applications"
        description="Review submissions, verify screenshots, approve or reject. Blobs auto-clean on transitions."
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUSES.map((s) => {
          const active = statusFilter.has(s);
          const count = counts[s] ?? 0;
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={cn(
                "px-3 h-8 text-xs uppercase tracking-[0.15em] border transition-colors flex items-center gap-2",
                active
                  ? STATUS_STYLES[s]
                  : "border-border-bronze/50 text-muted hover:border-border-bronze hover:text-foreground",
              )}
            >
              {s}
              <span className="text-[10px] font-mono opacity-70">{count}</span>
            </button>
          );
        })}
        {(statusFilter.size > 0 ||
          debounced ||
          powerMin ||
          kpMin ||
          maxValorMin ||
          marchesMin ||
          kingdom ||
          since ||
          scrollsOnly ||
          scoreMin) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter(new Set());
              setSearch("");
              setPowerMin("");
              setKpMin("");
              setMaxValorMin("");
              setMarchesMin("");
              setKingdom("");
              setSince("");
              setScrollsOnly(false);
              setScoreMin("");
            }}
            className="text-xs text-muted hover:text-foreground inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            clear
          </button>
        )}

        <div className="ml-auto relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="nickname / governor ID / discord"
            className="pl-9 w-full sm:w-72"
          />
        </div>
      </div>

      {/* Always-visible primary filter row */}
      <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
        <Input
          value={powerMin}
          onChange={(e) => setPowerMin(e.target.value)}
          placeholder="min power (80M)"
          className="w-36 sm:w-44"
        />
        <Input
          value={kpMin}
          onChange={(e) => setKpMin(e.target.value)}
          placeholder="min KP (100M)"
          className="w-36 sm:w-44"
        />
        <Input
          value={scoreMin}
          onChange={(e) => setScoreMin(e.target.value)}
          placeholder="min score (60)"
          className="w-32 sm:w-36"
        />
        <label className="inline-flex items-center gap-2 text-muted cursor-pointer h-10 px-3 border border-border-bronze">
          <input
            type="checkbox"
            checked={scrollsOnly}
            onChange={(e) => setScrollsOnly(e.target.checked)}
            className="h-3.5 w-3.5 accent-accent"
          />
          has scrolls
        </label>
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="h-10 px-3 border border-border-bronze text-muted hover:text-foreground hover:border-accent transition-colors"
        >
          {advancedOpen ? "− advanced" : "+ advanced"}
        </button>
      </div>

      {/* Collapsible advanced filters */}
      {advancedOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4 text-xs">
          <Input
            value={maxValorMin}
            onChange={(e) => setMaxValorMin(e.target.value)}
            placeholder="min max valor (5M)"
          />
          <Input
            value={marchesMin}
            onChange={(e) => setMarchesMin(e.target.value)}
            placeholder="min marches"
          />
          <Input
            value={kingdom}
            onChange={(e) => setKingdom(e.target.value)}
            placeholder="kingdom"
          />
          <Input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            placeholder="submitted since"
          />
        </div>
      )}

      {/* Mobile cards. Same data the table shows, just laid out vertically
          so admins on phones don't need horizontal scroll. */}
      <div className="md:hidden space-y-3">
        {loading && (
          <div className="p-12 text-center text-muted border border-border-bronze/50 bg-card/40">
            <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
            Loading…
          </div>
        )}
        {!loading && error && (
          <div className="p-8 text-center text-danger border border-danger/40 bg-danger/10">
            {error}
          </div>
        )}
        {!loading && !error && data?.items.length === 0 && (
          <div className="p-12 text-center text-muted border border-border-bronze/50 bg-card/40">
            No applications match these filters.
          </div>
        )}
        {!loading &&
          !error &&
          data?.items.map((row) => (
            <ApplicationCard key={row.id} row={row} />
          ))}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-muted">
            <span>
              Page {data.page} / {data.totalPages} · {data.total}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setPage((p) => Math.min(data.totalPages, p + 1))
                }
                disabled={page >= data.totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:block bg-card/80 border border-border-bronze/70 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background-deep/60 border-b border-border-bronze/70 text-muted">
                <Th label="Status" col="status" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="Score" col="overallScore" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="Nickname" col="nickname" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="Gov ID" col="governorId" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="Kingdom" col="currentKingdom" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="Power" col="power" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="KP" col="killPoints" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="T4" col="t4Kills" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="T5" col="t5Kills" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="Deaths" col="deaths" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="VIP" col="" />
                <Th label="Discord" col="" />
                <Th label="Scrolls" col="" />
                <Th label="Shots" col="" />
                <Th label="Submitted" col="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={15} className="p-12 text-center text-muted">
                    <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={15} className="p-12 text-center text-danger">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && data?.items.length === 0 && (
                <tr>
                  <td colSpan={15} className="p-12 text-center text-muted">
                    No applications match these filters.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                data?.items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border-bronze/30 hover:bg-background-deep/30 transition-colors"
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Link
                        href={`/applications/${row.id}`}
                        className={cn(
                          "inline-flex px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] border",
                          STATUS_STYLES[row.status],
                        )}
                      >
                        {row.status}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <ScoreChip score={row.overallScore} />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Link
                        href={`/applications/${row.id}`}
                        className="text-foreground hover:text-accent transition-colors font-medium"
                      >
                        {row.nickname}
                      </Link>
                      <TagRow
                        tags={row.tags}
                        manualTags={row.manualTags}
                        max={3}
                      />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs text-muted">
                      {row.governorId}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{row.currentKingdom}</td>
                    <td
                      className="px-3 py-2.5 whitespace-nowrap text-accent-bright"
                      title={row.power}
                    >
                      {row.powerN != null ? formatRokNumber(row.powerN) : row.power || "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap" title={row.killPoints}>
                      {row.killPointsN != null
                        ? formatRokNumber(row.killPointsN)
                        : row.killPoints || "—"}
                    </td>
                    <td
                      className="px-3 py-2.5 whitespace-nowrap text-muted"
                      title={row.t4Kills ?? undefined}
                    >
                      {row.t4KillsN != null
                        ? formatRokNumber(row.t4KillsN)
                        : row.t4Kills || "—"}
                    </td>
                    <td
                      className="px-3 py-2.5 whitespace-nowrap text-muted"
                      title={row.t5Kills ?? undefined}
                    >
                      {row.t5KillsN != null
                        ? formatRokNumber(row.t5KillsN)
                        : row.t5Kills || "—"}
                    </td>
                    <td
                      className="px-3 py-2.5 whitespace-nowrap text-muted"
                      title={row.deaths ?? undefined}
                    >
                      {row.deathsN != null
                        ? formatRokNumber(row.deathsN)
                        : row.deaths || "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{row.vipLevel || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted">{row.discordHandle}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-center">
                      {row.hasScrolls ? "✓" : "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-center text-muted">
                      {row.screenshots?.length ?? 0}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted text-xs">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-border-bronze/30 text-xs text-muted">
            <span>
              Page {data.page} of {data.totalPages} · {data.total} total
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setPage((p) => Math.min(data.totalPages, p + 1))
                }
                disabled={page >= data.totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} variant="info" />}
    </>
  );
}

/* ── mobile card ─────────────────────────────────────────────────── */

function ApplicationCard({
  row,
}: {
  row: MigrationApplicationListItem;
}) {
  const stat = (label: string, value: React.ReactNode, mono?: boolean) =>
    value === null || value === undefined || value === "—" ? null : (
      <div className="flex items-baseline justify-between gap-2 min-w-0">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted truncate">
          {label}
        </span>
        <span
          className={cn(
            "text-foreground shrink-0",
            mono && "font-mono text-xs",
          )}
        >
          {value}
        </span>
      </div>
    );

  return (
    <Link
      href={`/applications/${row.id}`}
      className="block border border-border-bronze/60 bg-card/70 backdrop-blur-sm p-4 hover:border-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-foreground tracking-[0.04em] uppercase truncate">
            {row.nickname}
          </div>
          <div className="text-[10px] text-muted mt-0.5 tracking-[0.15em] uppercase font-mono">
            #{row.governorId} · KD {row.currentKingdom}
            {row.currentAlliance ? ` · [${row.currentAlliance}]` : ""}
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span
            className={cn(
              "inline-flex px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] border",
              STATUS_STYLES[row.status],
            )}
          >
            {row.status}
          </span>
          <ScoreChip score={row.overallScore} />
        </div>
      </div>
      <TagRow tags={row.tags} manualTags={row.manualTags} max={4} className="mt-2" />

      <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-border-bronze/40 pt-3">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
          Power
        </span>
        <span className="text-lg text-accent-bright font-medium">
          {row.powerN != null ? formatRokNumber(row.powerN) : row.power || "—"}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {stat(
          "KP",
          row.killPointsN != null
            ? formatRokNumber(row.killPointsN)
            : row.killPoints || "—",
        )}
        {stat(
          "T4",
          row.t4KillsN != null
            ? formatRokNumber(row.t4KillsN)
            : row.t4Kills || "—",
        )}
        {stat(
          "T5",
          row.t5KillsN != null
            ? formatRokNumber(row.t5KillsN)
            : row.t5Kills || "—",
        )}
        {stat(
          "Deaths",
          row.deathsN != null
            ? formatRokNumber(row.deathsN)
            : row.deaths || "—",
        )}
        {stat("VIP", row.vipLevel || "—")}
        {stat(
          "Max valor",
          row.maxValorPointsN != null
            ? formatRokNumber(row.maxValorPointsN)
            : null,
        )}
        {stat("Marches", row.marches != null ? String(row.marches) : null)}
        {stat("Scrolls", row.hasScrolls ? "✓" : null)}
        {stat("Discord", row.discordHandle, true)}
      </div>

      <div className="mt-3 pt-2 border-t border-border-bronze/30 flex items-center justify-between text-[10px] text-muted">
        <span>{(row.screenshots ?? []).length} screenshots</span>
        <span>{new Date(row.createdAt).toLocaleString()}</span>
      </div>
    </Link>
  );
}

/**
 * Compact score chip for list views — colour banded by score range so
 * the eye picks out strong applicants at a glance. "—" when no score
 * is computed yet (legacy rows or freshly-imported data).
 */
function ScoreChip({ score }: { score: number | null }) {
  if (score == null)
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] border border-border-bronze/60 text-muted bg-background-deep/40">
        —
      </span>
    );
  const style =
    score >= 80
      ? "border-yellow-500/60 text-yellow-300 bg-yellow-500/15"
      : score >= 60
        ? "border-emerald-500/60 text-emerald-300 bg-emerald-500/15"
        : score >= 40
          ? "border-sky-500/60 text-sky-300 bg-sky-500/15"
          : score >= 20
            ? "border-amber-500/60 text-amber-300 bg-amber-500/15"
            : "border-red-500/60 text-red-300 bg-red-500/15";
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono border",
        style,
      )}
      title={`Overall score ${score.toFixed(1)} / 100`}
    >
      {score.toFixed(0)}
    </span>
  );
}

/**
 * Inline strip of up to `max` tag pills — auto + manual mixed, manual
 * rendered with a dashed outline so officers can distinguish their
 * curated tags from the engine's at a glance.
 */
function TagRow(props: {
  tags: string[] | null;
  manualTags: string[] | null;
  max: number;
  className?: string;
}) {
  const auto = (props.tags ?? []).map((t) => ({ slug: t, manual: false }));
  const manual = (props.manualTags ?? []).map((t) => ({
    slug: t,
    manual: true,
  }));
  const all = [...manual, ...auto].slice(0, props.max);
  if (all.length === 0) return null;
  const overflow = (auto.length + manual.length) - all.length;
  return (
    <div className={cn("flex flex-wrap gap-1 mt-1", props.className)}>
      {all.map(({ slug, manual: isManual }) => {
        const style = tagStyle(slug, isManual);
        return (
          <span
            key={`${isManual ? "m:" : "a:"}${slug}`}
            className={cn(
              "inline-flex items-center px-1.5 py-0 text-[10px] uppercase tracking-[0.1em] border",
              style.className,
              isManual && "border-dashed",
            )}
          >
            {style.label}
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="inline-flex items-center px-1.5 py-0 text-[10px] uppercase tracking-[0.1em] border border-border-bronze/60 text-muted bg-background-deep/40">
          +{overflow}
        </span>
      )}
    </div>
  );
}

function Th(props: {
  label: string;
  col: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (col: string) => void;
}) {
  const sortable = !!props.onSort && props.col.length > 0;
  const active = sortable && props.sortBy === props.col;
  return (
    <th
      onClick={sortable ? () => props.onSort!(props.col) : undefined}
      className={cn(
        "px-3 py-2.5 text-left text-[10px] uppercase tracking-[0.15em] font-semibold whitespace-nowrap",
        sortable && "cursor-pointer hover:text-foreground select-none",
        active && "text-accent",
      )}
    >
      <span className="inline-flex items-center gap-1">
        {props.label}
        {active &&
          (props.sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          ))}
      </span>
    </th>
  );
}
