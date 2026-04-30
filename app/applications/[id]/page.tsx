"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  Trash2,
  X as XIcon,
  Archive,
  ExternalLink,
} from "lucide-react";
import { applicationsApi } from "@/lib/api";
import {
  ApplicationStatus,
  AppScreenshot,
  MigrationApplicationDetail,
} from "@/lib/types";
// AppCommander removed — commanders are now eyeballed from screenshots only.
import { Button, Card, Input, Label, PageHeader, Textarea, Toast } from "@/components/ui";
import { cn, formatRokNumber } from "@/lib/utils";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending: "border-amber-500/60 text-amber-300 bg-amber-500/10",
  approved: "border-emerald-500/60 text-emerald-300 bg-emerald-500/10",
  rejected: "border-red-500/60 text-red-300 bg-red-500/10",
  archived: "border-border-bronze/60 text-muted bg-background-deep/40",
};

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;

  const [app, setApp] = React.useState<MigrationApplicationDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{
    message: string;
    variant: "info" | "success" | "error";
  } | null>(null);
  const [adminNotes, setAdminNotes] = React.useState("");
  const [lightbox, setLightbox] = React.useState<string | null>(null);

  const flash = React.useCallback(
    (message: string, variant: "info" | "success" | "error" = "info") => {
      setToast({ message, variant });
      setTimeout(() => setToast(null), 2400);
    },
    [],
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await applicationsApi.detail(id);
      setApp(detail);
      setAdminNotes(detail.adminNotes ?? "");
    } catch (e) {
      setError((e as Error).message ?? "load_failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    if (id) load();
  }, [id, load]);

  const transition = async (status: ApplicationStatus) => {
    if (!app) return;
    if (
      status === "archived" &&
      !confirm("Archiving deletes screenshots immediately. Continue?")
    ) {
      return;
    }
    setSaving(true);
    try {
      const updated = await applicationsApi.patch(id, {
        status,
        adminNotes: adminNotes.trim() || null,
      });
      setApp(updated);
      flash(`Status → ${status}`, "success");
    } catch (e) {
      flash((e as Error).message ?? "save_failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    if (!app) return;
    setSaving(true);
    try {
      const updated = await applicationsApi.patch(id, {
        adminNotes: adminNotes.trim() || null,
      });
      setApp(updated);
      flash("Notes saved", "success");
    } catch (e) {
      flash((e as Error).message ?? "save_failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const hardDelete = async () => {
    if (
      !confirm(
        "Permanently delete this application and all its screenshots? Cannot be undone.",
      )
    )
      return;
    setSaving(true);
    try {
      await applicationsApi.remove(id);
      router.replace("/applications");
    } catch (e) {
      flash((e as Error).message ?? "delete_failed", "error");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading…
      </div>
    );
  }
  if (error || !app) {
    return (
      <div className="py-24 text-center text-danger">
        {error ?? "Application not found"}
        <div className="mt-4">
          <Link href="/applications" className="text-accent hover:underline">
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  const screensByCat = groupScreenshots(app.screenshots ?? []);

  return (
    <>
      <PageHeader
        title={`${app.nickname} · ${app.governorId}`}
        description={`Submitted ${new Date(app.createdAt).toLocaleString()}${
          app.reviewedAt
            ? ` · reviewed ${new Date(app.reviewedAt).toLocaleString()}`
            : ""
        }`}
        actions={
          <Link href="/applications">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span
          className={cn(
            "px-2.5 py-1 text-[11px] uppercase tracking-[0.15em] border",
            STATUS_STYLES[app.status],
          )}
        >
          {app.status}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => transition("approved")}
            disabled={saving || app.status === "approved"}
          >
            <Check className="h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => transition("rejected")}
            disabled={saving || app.status === "rejected"}
          >
            <XIcon className="h-4 w-4" />
            Reject
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => transition("archived")}
            disabled={saving || app.status === "archived"}
          >
            <Archive className="h-4 w-4" />
            Archive
          </Button>
          <Button variant="danger" size="sm" onClick={hardDelete} disabled={saving}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="font-semibold uppercase tracking-[0.18em] text-sm mb-4">
              Identity
            </h3>
            <Grid>
              <Stat label="Nickname" value={app.nickname} />
              <Stat label="Governor ID" value={app.governorId} mono />
              <Stat label="Kingdom" value={app.currentKingdom} />
              <Stat label="Alliance" value={app.currentAlliance ?? "—"} />
              <Stat label="Discord" value={app.discordHandle} />
              <Stat label="VIP" value={app.vipLevel} />
            </Grid>
          </Card>

          <Card>
            <h3 className="font-semibold uppercase tracking-[0.18em] text-sm mb-4">
              Stats
            </h3>
            <Grid>
              <Stat
                label="Power"
                value={app.power}
                hint={app.powerN != null ? formatRokNumber(app.powerN) : undefined}
                highlight
              />
              <Stat
                label="Kill points"
                value={app.killPoints}
                hint={
                  app.killPointsN != null
                    ? formatRokNumber(app.killPointsN)
                    : undefined
                }
                highlight
              />
              <Stat
                label="T1 kills"
                value={app.t1Kills ?? "—"}
                hint={
                  app.t1KillsN != null ? formatRokNumber(app.t1KillsN) : undefined
                }
              />
              <Stat
                label="T2 kills"
                value={app.t2Kills ?? "—"}
                hint={
                  app.t2KillsN != null ? formatRokNumber(app.t2KillsN) : undefined
                }
              />
              <Stat
                label="T3 kills"
                value={app.t3Kills ?? "—"}
                hint={
                  app.t3KillsN != null ? formatRokNumber(app.t3KillsN) : undefined
                }
              />
              <Stat
                label="T4 kills"
                value={app.t4Kills ?? "—"}
                hint={
                  app.t4KillsN != null ? formatRokNumber(app.t4KillsN) : undefined
                }
              />
              <Stat
                label="T5 kills"
                value={app.t5Kills ?? "—"}
                hint={
                  app.t5KillsN != null ? formatRokNumber(app.t5KillsN) : undefined
                }
              />
              <Stat
                label="Deaths"
                value={app.deaths ?? "—"}
                hint={
                  app.deathsN != null ? formatRokNumber(app.deathsN) : undefined
                }
              />
              <Stat
                label="Healed"
                value={app.healed ?? "—"}
                hint={
                  app.healedN != null ? formatRokNumber(app.healedN) : undefined
                }
              />
              <Stat label="Resources gathered" value={app.resourcesGathered ?? "—"} />
              <Stat label="Previous KvK DKP" value={app.previousKvkDkp ?? "—"} />
            </Grid>
          </Card>

          <Card>
            <h3 className="font-semibold uppercase tracking-[0.18em] text-sm mb-4">
              Resources
            </h3>
            <Grid>
              <Stat
                label="Food"
                value={app.food ?? "—"}
                hint={app.foodN != null ? formatRokNumber(app.foodN) : undefined}
              />
              <Stat
                label="Wood"
                value={app.wood ?? "—"}
                hint={app.woodN != null ? formatRokNumber(app.woodN) : undefined}
              />
              <Stat
                label="Stone"
                value={app.stone ?? "—"}
                hint={app.stoneN != null ? formatRokNumber(app.stoneN) : undefined}
              />
              <Stat
                label="Gold"
                value={app.gold ?? "—"}
                hint={app.goldN != null ? formatRokNumber(app.goldN) : undefined}
              />
            </Grid>
          </Card>

          <Card>
            <h3 className="font-semibold uppercase tracking-[0.18em] text-sm mb-4">
              Speedups
            </h3>
            <Grid>
              <Stat
                label="Construction"
                value={fmtDuration(app.speedupsConstructionMinutes)}
              />
              <Stat
                label="Research"
                value={fmtDuration(app.speedupsResearchMinutes)}
              />
              <Stat
                label="Training"
                value={fmtDuration(app.speedupsTrainingMinutes)}
              />
              <Stat
                label="Healing"
                value={fmtDuration(app.speedupsHealingMinutes)}
              />
              <Stat
                label="Universal"
                value={fmtDuration(app.speedupsUniversalMinutes)}
              />
              <Stat
                label="Total"
                value={fmtDuration(app.speedupsMinutes)}
                highlight
              />
            </Grid>
          </Card>

          <Card>
            <h3 className="font-semibold uppercase tracking-[0.18em] text-sm mb-4">
              Commanders & equipment
            </h3>
            <p className="text-muted text-xs mb-4">
              Officer review — eyeball the {(app.screenshots ?? []).filter((s) => s.category === "commander").length}{" "}
              commander screenshots in the gallery on the right.
            </p>
            <Grid>
              <Stat
                label="Marches"
                value={app.marches != null ? String(app.marches) : "—"}
                highlight
              />
            </Grid>
          </Card>

          <Card>
            <h3 className="font-semibold uppercase tracking-[0.18em] text-sm mb-4">
              About
            </h3>
            <Grid>
              <Stat label="Activity" value={app.activityHours ?? "—"} />
              <Stat label="Timezone" value={app.timezone ?? "—"} />
              <Stat label="Has scrolls" value={app.hasScrolls ? "Yes" : "No"} />
            </Grid>
            {app.reason && (
              <div className="mt-4">
                <Label>Reason</Label>
                <p className="text-sm text-foreground whitespace-pre-wrap border border-border-bronze/40 px-3 py-2 bg-background-deep/30">
                  {app.reason}
                </p>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold uppercase tracking-[0.18em] text-sm mb-4">
              Admin notes
            </h3>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes (not visible to applicant)…"
              rows={4}
            />
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="primary" onClick={saveNotes} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save notes
              </Button>
            </div>
          </Card>

          {app.ocrRawText && (
            <Card>
              <details>
                <summary className="cursor-pointer font-semibold uppercase tracking-[0.18em] text-sm flex items-center justify-between">
                  <span>OCR raw text</span>
                  <span className="text-[10px] text-muted normal-case tracking-normal">
                    {app.ocrRawText.length.toLocaleString()} chars
                  </span>
                </summary>
                <pre className="mt-3 max-h-72 overflow-auto p-3 bg-background-deep/40 border border-border-bronze/40 text-[11px] text-muted whitespace-pre-wrap font-mono">
                  {app.ocrRawText}
                </pre>
              </details>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold uppercase tracking-[0.18em] text-sm">
                Screenshots
              </h3>
              <span className="text-xs text-muted">
                {app.screenshots?.length ?? 0} total
              </span>
            </div>
            {app.screenshots?.length === 0 && (
              <p className="text-xs text-muted italic">
                Blobs cleaned. The parsed data above remains queryable.
              </p>
            )}
            {(["account", "commander", "resource", "dkp", "other"] as const).map(
              (cat) => {
                const list = screensByCat[cat] ?? [];
                if (list.length === 0) return null;
                return (
                  <div key={cat} className="mb-4 last:mb-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-2">
                      {cat} ({list.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {list.map((s) => (
                        <button
                          key={s.url}
                          type="button"
                          onClick={() => setLightbox(s.url)}
                          className="relative aspect-square border border-border-bronze/50 overflow-hidden hover:border-accent transition-colors"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={s.url}
                            alt={s.label ?? cat}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              },
            )}
            {app.blobCleanupAt && (
              <p className="mt-3 text-[11px] text-muted">
                Auto-cleanup: {new Date(app.blobCleanupAt).toLocaleString()}
              </p>
            )}
          </Card>
        </div>
      </div>

      {lightbox && (
        <button
          type="button"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-background-deep/90 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <a
            href={lightbox}
            target="_blank"
            rel="noreferrer noopener"
            className="absolute top-4 right-4 text-muted hover:text-foreground inline-flex items-center gap-1 text-xs uppercase tracking-[0.15em]"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" /> Open
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="screenshot"
            className="max-w-full max-h-full object-contain"
          />
        </button>
      )}

      {toast && <Toast message={toast.message} variant={toast.variant} />}
    </>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function Stat({
  label,
  value,
  mono,
  highlight,
  hint,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  /** Secondary line — used for the normalized "84.2M" display under the raw input. */
  hint?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <p
        className={cn(
          "text-sm",
          highlight && "text-accent-bright font-medium",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </p>
      {hint && hint !== value && (
        <p className="text-[11px] text-muted font-mono">{hint}</p>
      )}
    </div>
  );
}

function groupScreenshots(list: AppScreenshot[]) {
  const out: Record<string, AppScreenshot[]> = {};
  for (const s of list) {
    const cat = s.category ?? "other";
    (out[cat] ??= []).push(s);
  }
  return out;
}

/** Convert minutes (Int) into a compact "63d 12h 20m" display string. */
function fmtDuration(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return "—";
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 && d === 0) parts.push(`${m}m`);
  return parts.join(" ") || `${minutes}m`;
}
