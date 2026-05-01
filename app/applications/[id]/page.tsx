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
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  AlertTriangle,
  Hand,
} from "lucide-react";
import { applicationsApi } from "@/lib/api";
import {
  ApplicationStatus,
  AppScreenshot,
  MigrationApplicationDetail,
  ScoringProfile,
  SpendingTier,
} from "@/lib/types";
// AppCommander removed — commanders are now eyeballed from screenshots only.
import { Button, Card, Input, Label, PageHeader, Textarea, Toast } from "@/components/ui";
import {
  cn,
  formatRokNumber,
  percentileBadge,
  tagStyle,
} from "@/lib/utils";

const SPENDING_TIER_OPTIONS: { value: SpendingTier; label: string }[] = [
  { value: "f2p", label: "F2P" },
  { value: "low", label: "Low" },
  { value: "mid", label: "Mid" },
  { value: "high", label: "High" },
  { value: "whale", label: "Whale" },
  { value: "kraken", label: "Kraken" },
];

const SCORING_PROFILE_OPTIONS: {
  value: ScoringProfile;
  label: string;
  hint: string;
}[] = [
  {
    value: "lost-kingdom",
    label: "Lost Kingdom",
    hint: "KvK 1–4, mostly T4, low KP/deaths",
  },
  {
    value: "season-of-conquest",
    label: "Season of Conquest",
    hint: "Post-LK, T5-heavy, ~10× higher KP",
  },
];

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
  const [manualTagDraft, setManualTagDraft] = React.useState("");
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

  /**
   * Build the props bundle a stat-style watched field needs from the
   * server-side drift + autofill data. Returns nothing if the field
   * isn't watched. `kind` controls how we humanize numbers in the
   * popover — "stat" → formatRokNumber, "duration" → formatMinutes.
   */
  const driftProps = (
    key: string,
    currentN: number | null,
    kind: "stat" | "duration",
  ) => {
    const flag = app.driftFlags?.[key];
    if (!flag) return {};
    const auto = app.ocrAutofill?.[key];
    const fmt = kind === "duration" ? formatMinutes : formatRokNumber;
    return {
      drift: flag,
      autofilledLabel: typeof auto === "number" ? fmt(auto) : null,
      currentLabel:
        currentN != null
          ? fmt(currentN)
          : null,
    };
  };

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
              Account verification
            </h3>
            <ScoutVerificationBlock
              scoutVerified={app.scoutVerified}
              accountBornAt={app.accountBornAt}
              hasVerificationScreens={
                (app.screenshots ?? []).some(
                  (s) => s.category === "verification",
                )
              }
            />
          </Card>

          <Card>
            <h3 className="font-semibold uppercase tracking-[0.18em] text-sm mb-4">
              Profile assessment
            </h3>
            <ScoreBar score={app.overallScore} breakdown={app.scoreBreakdown} />
            <div className="mt-5">
              <Label>Scoring profile</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {SCORING_PROFILE_OPTIONS.map((opt) => {
                  const active = app.effectiveProfile === opt.value;
                  // Lock when SoC was auto-inferred from a ≥12mo account.
                  // The inference is data-driven; switching to LK would
                  // misrepresent the applicant's stage. Once admin makes
                  // an explicit choice (any choice) the lock lifts —
                  // they can change their mind.
                  const lockedByInference =
                    app.profileAutoInferred &&
                    app.effectiveProfile === "season-of-conquest";
                  const disabled =
                    active || saving || (lockedByInference && !active);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      title={
                        lockedByInference && !active
                          ? "Locked — applicant is ≥12mo old, SoC profile auto-inferred. To override, edit accountBornAt."
                          : opt.hint
                      }
                      disabled={disabled}
                      onClick={async () => {
                        if (active || saving || lockedByInference) return;
                        setSaving(true);
                        try {
                          const updated = await applicationsApi.patch(id, {
                            scoringProfile: opt.value,
                          });
                          setApp(updated);
                          flash(`Profile → ${opt.label}, score recomputed`, "success");
                        } catch (e) {
                          flash(
                            (e as Error).message ?? "save_failed",
                            "error",
                          );
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className={cn(
                        "px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] border transition",
                        active
                          ? "border-accent text-accent-bright bg-accent/15"
                          : lockedByInference
                            ? "border-border-bronze/30 text-muted/40 cursor-not-allowed"
                            : "border-border-bronze/60 text-muted hover:border-accent/60",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[10px] text-muted">
                {app.profileAutoInferred
                  ? `Auto-inferred from account age (${app.effectiveProfile === "season-of-conquest" ? "≥12mo → SoC" : "<12mo → LK"}). ${app.effectiveProfile === "season-of-conquest" ? "Locked." : "Click LK or SoC to override if needed."}`
                  : "Manual override active. Click the other pill to switch."}
              </p>
            </div>
            <div className="mt-5">
              <Label>Spending tier</Label>
              <div className="mt-1">
                {app.spendingTier ? (
                  (() => {
                    const opt = SPENDING_TIER_OPTIONS.find(
                      (o) => o.value === app.spendingTier,
                    );
                    return (
                      <span className="inline-flex items-center px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] border border-accent text-accent-bright bg-accent/15">
                        {opt?.label ?? app.spendingTier}
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-xs text-muted italic">
                    Applicant did not declare a tier.
                  </span>
                )}
              </div>
            </div>
            <div className="mt-5">
              <Label>Auto tags</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {app.tags && app.tags.length > 0 ? (
                  app.tags.map((slug) => <TagPill key={slug} slug={slug} />)
                ) : (
                  <span className="text-xs text-muted italic">
                    No auto tags assigned.
                  </span>
                )}
              </div>
            </div>
            <div className="mt-5">
              <Label>Manual tags</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(app.manualTags ?? []).map((slug) => (
                  <TagPill
                    key={slug}
                    slug={slug}
                    isManual
                    onRemove={async () => {
                      if (saving) return;
                      setSaving(true);
                      try {
                        const next = (app.manualTags ?? []).filter(
                          (t) => t !== slug,
                        );
                        const updated = await applicationsApi.patch(id, {
                          manualTags: next,
                        });
                        setApp(updated);
                      } catch (e) {
                        flash((e as Error).message ?? "save_failed", "error");
                      } finally {
                        setSaving(false);
                      }
                    }}
                  />
                ))}
              </div>
              <form
                className="mt-2 flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const tag = manualTagDraft.trim();
                  if (!tag || saving) return;
                  setSaving(true);
                  try {
                    const next = [
                      ...new Set([...(app.manualTags ?? []), tag]),
                    ].slice(0, 20);
                    const updated = await applicationsApi.patch(id, {
                      manualTags: next,
                    });
                    setApp(updated);
                    setManualTagDraft("");
                  } catch (err) {
                    flash((err as Error).message ?? "save_failed", "error");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <Input
                  value={manualTagDraft}
                  onChange={(e) => setManualTagDraft(e.target.value)}
                  placeholder="Add custom tag…"
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={!manualTagDraft.trim() || saving}
                >
                  Add
                </Button>
              </form>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold uppercase tracking-[0.18em] text-sm mb-4">
              KvK record
            </h3>
            <Grid>
              <Stat
                label="Max valor (lifetime)"
                value={displayStat(app.maxValorPoints, app.maxValorPointsN)}
                highlight
                pct={app.percentiles?.maxValorPoints}
              />
            </Grid>
          </Card>

          {(app.previousKvkDkp ||
            app.prevKvkT4Kills ||
            app.prevKvkT5Kills ||
            app.prevKvkDeaths ||
            app.prevKvkKillPoints) && (
            <Card>
              <h3 className="font-semibold uppercase tracking-[0.18em] text-sm mb-1">
                Last KvK
              </h3>
              <p className="text-xs text-muted mb-4">
                From the applicant&apos;s DKP-scan upload. Independent of
                the lifetime account stats above.
              </p>
              <Grid>
                <Stat
                  label="DKP score (reported)"
                  value={displayStat(app.previousKvkDkp, app.previousKvkDkpN)}
                  highlight
                />
                <Stat
                  label="DKP (server-computed)"
                  value={
                    app.prevKvkDkpComputed != null
                      ? formatRokNumber(app.prevKvkDkpComputed)
                      : "—"
                  }
                  highlight
                />
                <Stat
                  label="T4 kills"
                  value={displayStat(app.prevKvkT4Kills, app.prevKvkT4KillsN)}
                />
                <Stat
                  label="T5 kills"
                  value={displayStat(app.prevKvkT5Kills, app.prevKvkT5KillsN)}
                />
                <Stat
                  label="Deaths"
                  value={displayStat(app.prevKvkDeaths, app.prevKvkDeathsN)}
                />
                <Stat
                  label="Kill points"
                  value={displayStat(
                    app.prevKvkKillPoints,
                    app.prevKvkKillPointsN,
                  )}
                />
              </Grid>
              <DkpDriftHint
                reported={app.previousKvkDkpN}
                computed={app.prevKvkDkpComputed}
                profile={app.scoringProfile ?? "lost-kingdom"}
              />
            </Card>
          )}

          <Card>
            <h3 className="font-semibold uppercase tracking-[0.18em] text-sm mb-4">
              Stats
            </h3>
            <Grid>
              <Stat
                label="Power"
                value={displayStat(app.power, app.powerN)}
                highlight
                pct={app.percentiles?.power}
                {...driftProps("power", app.powerN, "stat")}
              />
              <Stat
                label="Kill points"
                value={displayStat(app.killPoints, app.killPointsN)}
                highlight
                pct={app.percentiles?.killPoints}
                {...driftProps("killPoints", app.killPointsN, "stat")}
              />
              <Stat
                label="T1 kills"
                value={displayStat(app.t1Kills, app.t1KillsN)}
              />
              <Stat
                label="T2 kills"
                value={displayStat(app.t2Kills, app.t2KillsN)}
              />
              <Stat
                label="T3 kills"
                value={displayStat(app.t3Kills, app.t3KillsN)}
              />
              <Stat
                label="T4 kills"
                value={displayStat(app.t4Kills, app.t4KillsN)}
                {...driftProps("t4Kills", app.t4KillsN, "stat")}
              />
              <Stat
                label="T5 kills"
                value={displayStat(app.t5Kills, app.t5KillsN)}
                {...driftProps("t5Kills", app.t5KillsN, "stat")}
              />
              <Stat
                label="Deaths"
                value={displayStat(app.deaths, app.deathsN)}
                pct={app.percentiles?.deaths}
                {...driftProps("deaths", app.deathsN, "stat")}
              />
              <Stat
                label="Resources gathered"
                value={displayStat(app.resourcesGathered, app.resourcesGatheredN)}
              />
              <Stat
                label="Previous KvK DKP"
                value={displayStat(app.previousKvkDkp, app.previousKvkDkpN)}
              />
            </Grid>
          </Card>

          <Card>
            <h3 className="font-semibold uppercase tracking-[0.18em] text-sm mb-4">
              Resources
            </h3>
            <Grid>
              <Stat
                label="Food"
                value={displayStat(app.food, app.foodN)}
                {...driftProps("food", app.foodN, "stat")}
              />
              <Stat
                label="Wood"
                value={displayStat(app.wood, app.woodN)}
                {...driftProps("wood", app.woodN, "stat")}
              />
              <Stat
                label="Stone"
                value={displayStat(app.stone, app.stoneN)}
                {...driftProps("stone", app.stoneN, "stat")}
              />
              <Stat
                label="Gold"
                value={displayStat(app.gold, app.goldN)}
                {...driftProps("gold", app.goldN, "stat")}
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
                {...driftProps(
                  "speedupsConstruction",
                  app.speedupsConstructionMinutes,
                  "duration",
                )}
              />
              <Stat
                label="Research"
                value={fmtDuration(app.speedupsResearchMinutes)}
                {...driftProps(
                  "speedupsResearch",
                  app.speedupsResearchMinutes,
                  "duration",
                )}
              />
              <Stat
                label="Training"
                value={fmtDuration(app.speedupsTrainingMinutes)}
                {...driftProps(
                  "speedupsTraining",
                  app.speedupsTrainingMinutes,
                  "duration",
                )}
              />
              <Stat
                label="Healing"
                value={fmtDuration(app.speedupsHealingMinutes)}
                {...driftProps(
                  "speedupsHealing",
                  app.speedupsHealingMinutes,
                  "duration",
                )}
              />
              <Stat
                label="Universal"
                value={fmtDuration(app.speedupsUniversalMinutes)}
                {...driftProps(
                  "speedupsUniversal",
                  app.speedupsUniversalMinutes,
                  "duration",
                )}
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
            {(
              [
                "verification",
                "account",
                "commander",
                "resource",
                "dkp",
                "other",
              ] as const
            ).map(
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
  pct,
  drift,
  autofilledLabel,
  currentLabel,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  /** Cohort percentile 0..1 — renders a colored band pill if in top 50%. */
  pct?: number | null;
  /** Server-computed verdict: "auto-edited" / "manual" / null. */
  drift?: "auto-edited" | "manual" | null;
  /** Pre-formatted display string of what OCR auto-filled (used inside
   *  the auto-edited popover). E.g. "84.2M" / "63d 12h". */
  autofilledLabel?: string | null;
  /** Pre-formatted display string of the current/final value, for the
   *  same popover. */
  currentLabel?: string | null;
}) {
  const badge = percentileBadge(pct);
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-baseline gap-2">
        <p
          className={cn(
            "text-sm",
            highlight && "text-accent-bright font-medium",
            mono && "font-mono text-xs",
          )}
        >
          {value}
        </p>
        {drift && (
          <DriftBadge
            flag={drift}
            autofilledLabel={autofilledLabel ?? null}
            currentLabel={currentLabel ?? null}
          />
        )}
        {badge && (
          <span
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] border",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        )}
      </div>
    </div>
  );
}

/** Pick the most-readable display: formatted from N if available, else
 *  the raw string the applicant typed. Falls back to "—" when both are
 *  empty. */
function displayStat(raw: string | null | undefined, n: number | null | undefined): string {
  if (n != null) return formatRokNumber(n);
  if (raw && raw.trim()) return raw;
  return "—";
}

/**
 * Floating popover next to a Stat value when admin should look closer.
 *
 *   "auto-edited" → amber AlertTriangle. Popover: "Auto-parsed: X.
 *                   Applicant submitted: Y. Compare against the source
 *                   screenshot before approving."
 *   "manual"      → muted Hand icon. Popover: "Filled manually — no
 *                   OCR snapshot to verify against."
 *
 * The popover is hover/focus-driven and absolutely positioned; we use
 * `peer` + opacity so we don't pull in a Radix dependency for a single
 * tooltip. Keyboard-friendly via the inner button.
 */
function DriftBadge(props: {
  flag: "auto-edited" | "manual";
  autofilledLabel: string | null;
  currentLabel: string | null;
}) {
  const isEdited = props.flag === "auto-edited";
  const Icon = isEdited ? AlertTriangle : Hand;
  const tone = isEdited
    ? "border-amber-500/60 text-amber-300 bg-amber-500/15"
    : "border-border-bronze/60 text-muted bg-background-deep/40";

  return (
    <span className="relative inline-flex group">
      <button
        type="button"
        tabIndex={0}
        aria-label={isEdited ? "Auto-edited" : "Filled manually"}
        className={cn(
          "inline-flex items-center justify-center h-4 w-4 border cursor-help",
          tone,
        )}
      >
        <Icon className="h-2.5 w-2.5" />
      </button>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 w-56 z-30",
          "border bg-card text-foreground shadow-lg",
          "px-2.5 py-2 text-[11px] leading-snug",
          "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          "transition-opacity",
          isEdited ? "border-amber-500/60" : "border-border-bronze/60",
        )}
      >
        {isEdited ? (
          <>
            <div className="font-semibold uppercase tracking-[0.1em] text-amber-300 text-[9px] mb-1">
              Auto-edited (&gt; 5% drift)
            </div>
            <div>
              Auto-parsed:{" "}
              <span className="font-mono text-foreground">
                {props.autofilledLabel ?? "—"}
              </span>
            </div>
            <div>
              Applicant:{" "}
              <span className="font-mono text-foreground">
                {props.currentLabel ?? "—"}
              </span>
            </div>
            <div className="mt-1 text-muted">
              Cross-check the source screenshot before approving.
            </div>
          </>
        ) : (
          <>
            <div className="font-semibold uppercase tracking-[0.1em] text-muted text-[9px] mb-1">
              Filled manually
            </div>
            <div className="text-muted">
              No OCR snapshot recorded for this field — value typed by hand.
            </div>
          </>
        )}
      </span>
    </span>
  );
}

/**
 * Compares the applicant's reported DKP score against the server-side
 * recompute (T4×10 + T5×W + deaths×W using the active profile's
 * weights — Variant A 10/30/80 for SoC, Variant B 10/20/50 for LK).
 * Surfaces an amber hint when the two diverge significantly, so admin
 * can ask whether the applicant fudged the number or if the upstream
 * KvK had non-standard weights.
 */
function DkpDriftHint(props: {
  reported: number | null;
  computed: number | null;
  profile: ScoringProfile;
}) {
  if (props.reported == null || props.computed == null) return null;
  if (props.computed === 0) return null;
  const drift = Math.abs(props.reported - props.computed) / props.computed;
  if (drift <= 0.1) return null;
  const profileLabel =
    props.profile === "season-of-conquest"
      ? "SoC weights 10/30/80"
      : "LK weights 10/20/50";
  const direction =
    props.reported > props.computed ? "higher" : "lower";
  return (
    <div className="mt-3 flex items-start gap-2 border border-amber-500/40 bg-amber-500/5 p-2.5 text-[11px] text-amber-200">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        Reported DKP is{" "}
        <span className="font-mono">
          {Math.round(drift * 100)}% {direction}
        </span>{" "}
        than the server recompute ({profileLabel}). Could mean upstream
        alliance used different weights — or applicant fudged.
      </div>
    </div>
  );
}

/** Convert minutes to "63d 12h 20m" for the popover comparison. */
function formatMinutes(minutes: number | null | undefined): string {
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

/**
 * Compact tag pill. Auto and manual tags share the design but manual
 * gets a subtle outlined-only treatment + a remove × so officers can
 * un-tag without leaving the page.
 */
function TagPill(props: {
  slug: string;
  isManual?: boolean;
  onRemove?: () => void;
}) {
  const style = tagStyle(props.slug, props.isManual);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] uppercase tracking-[0.1em] border",
        style.className,
        props.isManual && "border-dashed",
      )}
    >
      {style.label}
      {props.onRemove && (
        <button
          type="button"
          onClick={props.onRemove}
          className="-mr-0.5 ml-0.5 opacity-60 hover:opacity-100"
          aria-label={`Remove ${style.label}`}
        >
          <XIcon className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

/**
 * Per-component cap table — must match scoring.ts CAPS exactly. Used
 * to render the "X / cap" breakdown in the score popover so admin can
 * see WHY a score landed where it did. Age is intentionally excluded
 * from the popover per user feedback ("кроме возраста" — age is
 * non-negotiable, no decision lever there).
 */
const SCORE_COMPONENT_DISPLAY: Array<{
  key: keyof MigrationApplicationDetail["scoreBreakdown"];
  label: string;
  cap: number;
}> = [
  { key: "power", label: "Power", cap: 18 },
  { key: "killPoints", label: "Kill points", cap: 18 },
  { key: "deaths", label: "Deaths", cap: 14 },
  { key: "valor", label: "Max valor", cap: 10 },
  { key: "t5Kills", label: "T5 kills", cap: 12 },
  { key: "prevKvkDkp", label: "Prev KvK DKP", cap: 8 },
  { key: "vip", label: "VIP", cap: 8 },
];

function ScoreBar(props: {
  score: number | null;
  breakdown: MigrationApplicationDetail["scoreBreakdown"] | undefined;
}) {
  const score = props.score ?? 0;
  const color =
    score >= 80
      ? "bg-yellow-500"
      : score >= 60
        ? "bg-emerald-500"
        : score >= 40
          ? "bg-sky-500"
          : score >= 20
            ? "bg-amber-500"
            : "bg-red-500";
  const breakdown = props.breakdown;

  return (
    <div className="relative group">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
          Overall score
        </span>
        <button
          type="button"
          className="font-mono text-2xl text-foreground cursor-help focus:outline-none"
          aria-label="Show score breakdown"
        >
          {props.score != null ? props.score.toFixed(1) : "—"}
          <span className="text-xs text-muted ml-1">/100</span>
        </button>
      </div>
      <div className="h-2 w-full bg-background-deep border border-border-bronze/40 overflow-hidden">
        <div
          className={cn("h-full transition-all", color)}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
      {breakdown && (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute right-0 top-full mt-2 w-72 z-30",
            "border border-border-bronze/70 bg-card shadow-lg",
            "px-3 py-2.5",
            "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            "transition-opacity",
          )}
        >
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted mb-2">
            Score breakdown
          </div>
          <table className="w-full text-[11px]">
            <tbody>
              {SCORE_COMPONENT_DISPLAY.map((c) => {
                const v = breakdown[c.key];
                const pct = v / c.cap;
                const tone =
                  pct >= 0.8
                    ? "text-emerald-300"
                    : pct >= 0.5
                      ? "text-foreground"
                      : "text-amber-300";
                return (
                  <tr key={c.key} className="border-b border-border-bronze/20 last:border-0">
                    <td className="py-1 pr-2 text-muted">{c.label}</td>
                    <td className={cn("py-1 text-right font-mono", tone)}>
                      {v.toFixed(1)}
                      <span className="text-muted">/{c.cap}</span>
                    </td>
                  </tr>
                );
              })}
              {breakdown.spendingModifier !== 0 && (
                <tr className="border-b border-border-bronze/20">
                  <td className="py-1 pr-2 text-muted">Spending mod</td>
                  <td
                    className={cn(
                      "py-1 text-right font-mono",
                      breakdown.spendingModifier > 0
                        ? "text-emerald-300"
                        : "text-amber-300",
                    )}
                  >
                    {breakdown.spendingModifier > 0 ? "+" : ""}
                    {breakdown.spendingModifier}
                  </td>
                </tr>
              )}
              {breakdown.sanityPenalty !== 0 && (
                <tr className="border-b border-border-bronze/20">
                  <td className="py-1 pr-2 text-muted">Sanity penalty</td>
                  <td className="py-1 text-right font-mono text-red-300">
                    {breakdown.sanityPenalty}
                  </td>
                </tr>
              )}
              <tr>
                <td className="pt-2 pr-2 font-medium uppercase tracking-[0.12em] text-[9px] text-muted">
                  Total
                </td>
                <td className="pt-2 text-right font-mono text-base text-foreground">
                  {props.score != null ? props.score.toFixed(1) : "—"}
                  <span className="text-muted text-[10px]">/100</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Verification card body. Three visual states:
 *  - Scout verified  → green ShieldCheck + birth date + "X yrs Y mos old"
 *  - Wrong commander → amber ShieldAlert ("uploaded but not Scout — request a re-upload")
 *  - Nothing uploaded → muted ShieldQuestion ("no proof submitted")
 *
 * If `accountBornAt` is null but `scoutVerified` is true, the OCR confirmed
 * Scout but failed to read a date — show a milder warning so the admin
 * can ask for a re-upload of the same screen at a higher quality.
 */
function ScoutVerificationBlock(props: {
  scoutVerified: boolean;
  accountBornAt: string | null;
  hasVerificationScreens: boolean;
}) {
  if (props.scoutVerified) {
    return (
      <div className="flex items-start gap-3">
        <div className="shrink-0 inline-flex h-9 w-9 items-center justify-center border border-emerald-500/60 bg-emerald-500/10 text-emerald-300">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-emerald-300 font-medium">
            Scout commander confirmed
          </p>
          {props.accountBornAt ? (
            <>
              <p className="text-xs text-muted mt-0.5">
                Account created{" "}
                <span className="font-mono text-foreground">
                  {fmtBirthDate(props.accountBornAt)}
                </span>{" "}
                · {fmtAccountAge(props.accountBornAt)}
              </p>
            </>
          ) : (
            <p className="text-xs text-amber-300 mt-0.5">
              Recruit date unreadable — ask for a higher-resolution
              re-upload of the same Scout screen.
            </p>
          )}
        </div>
      </div>
    );
  }
  if (props.hasVerificationScreens) {
    return (
      <div className="flex items-start gap-3">
        <div className="shrink-0 inline-flex h-9 w-9 items-center justify-center border border-amber-500/60 bg-amber-500/10 text-amber-300">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-amber-300 font-medium">
            Wrong commander uploaded
          </p>
          <p className="text-xs text-muted mt-0.5">
            The applicant submitted a verification screenshot, but it was
            not the starter Scout. Request a re-upload before approving.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 inline-flex h-9 w-9 items-center justify-center border border-border-bronze/60 bg-background-deep/40 text-muted">
        <ShieldQuestion className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted font-medium">No verification submitted</p>
        <p className="text-xs text-muted mt-0.5">
          Account age cannot be confirmed.
        </p>
      </div>
    </div>
  );
}

/** Format an ISO timestamp as "2026-02-07" for compact display. */
function fmtBirthDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** "3 yrs 2 mos" / "8 mos" / "12 days" depending on magnitude. */
function fmtAccountAge(iso: string): string {
  const born = new Date(iso);
  const now = new Date();
  let months =
    (now.getUTCFullYear() - born.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - born.getUTCMonth());
  if (now.getUTCDate() < born.getUTCDate()) months -= 1;
  if (months <= 0) {
    const days = Math.max(
      0,
      Math.floor((now.getTime() - born.getTime()) / 86400_000),
    );
    return `${days} day${days === 1 ? "" : "s"} old`;
  }
  if (months < 12) return `${months} mo${months === 1 ? "" : "s"} old`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0
    ? `${years} yr${years === 1 ? "" : "s"} old`
    : `${years} yr${years === 1 ? "" : "s"} ${rem} mo${rem === 1 ? "" : "s"} old`;
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
