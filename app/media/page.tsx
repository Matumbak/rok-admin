"use client";

import * as React from "react";
import { ExternalLink, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { mediaApi } from "@/lib/api";
import type { MediaItem } from "@/lib/types";
import {
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  Toast,
} from "@/components/ui";

type FormState = {
  id?: string;
  url: string;
  title: string; // optional override
  order: number;
  active: boolean;
};

const EMPTY: FormState = { url: "", title: "", order: 0, active: true };

export default function MediaPage() {
  const [items, setItems] = React.useState<MediaItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState<FormState | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [toast, setToast] = React.useState<{
    message: string;
    variant: "info" | "success" | "error";
  } | null>(null);

  const flash = (message: string, variant: "info" | "success" | "error" = "info") => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 2400);
  };

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await mediaApi.listAdmin();
      setItems(items);
    } catch (err) {
      flash(`Load failed: ${(err as Error).message}`, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    try {
      if (form.id) {
        await mediaApi.update(form.id, {
          url: form.url,
          title: form.title || undefined,
          order: form.order,
          active: form.active,
        });
        flash("Updated", "success");
      } else {
        await mediaApi.create({
          url: form.url,
          title: form.title || undefined,
          order: form.order,
          active: form.active,
        });
        flash("Created — title fetched from YouTube", "success");
      }
      setForm(null);
      refresh();
    } catch (err) {
      flash(`Save failed: ${(err as Error).message}`, "error");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this media item?")) return;
    try {
      await mediaApi.remove(id);
      flash("Deleted", "success");
      refresh();
    } catch (err) {
      flash(`Delete failed: ${(err as Error).message}`, "error");
    }
  };

  const onRefreshTitles = async () => {
    setRefreshing(true);
    try {
      const r = await mediaApi.refreshTitles();
      flash(`Refreshed ${r.refreshed} of ${r.total}`, "success");
      refresh();
    } catch (err) {
      flash(`Refresh failed: ${(err as Error).message}`, "error");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Media"
        description="YouTube videos shown on the landing’s Media page. Paste only the URL — the title and thumbnail are pulled from YouTube’s public oEmbed automatically."
        actions={
          <>
            <Button
              variant="outline"
              onClick={onRefreshTitles}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Re-fetch titles
            </Button>
            <Button onClick={() => setForm({ ...EMPTY })}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </>
        }
      />

      {form && (
        <Card className="mb-6">
          <h2 className="text-sm uppercase tracking-[0.2em] text-accent mb-4">
            {form.id ? "Edit media" : "New media"}
          </h2>
          <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="url">YouTube URL</Label>
              <Input
                id="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=…"
                required
              />
              <p className="text-xs text-muted mt-1.5">
                Accepts youtu.be/<em>id</em>, /watch?v=<em>id</em>, /shorts/
                <em>id</em>, /embed/<em>id</em>.
              </p>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="title">Title (optional override)</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                placeholder="Leave blank to use YouTube title"
              />
            </div>
            <div>
              <Label htmlFor="order">Order</Label>
              <Input
                id="order"
                type="number"
                value={form.order}
                onChange={(e) =>
                  setForm({ ...form, order: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex items-end gap-2">
              <input
                id="active"
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm({ ...form, active: e.target.checked })
                }
                className="h-4 w-4 accent-[var(--accent)]"
              />
              <Label htmlFor="active" className="mb-0">
                Active
              </Label>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setForm(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-0 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted">No media yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-background-deep/60">
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-accent">
                <th className="px-4 py-3 w-16">#</th>
                <th className="px-4 py-3 w-40">Thumb</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3 hidden md:table-cell">Video ID</th>
                <th className="px-4 py-3 w-20">Active</th>
                <th className="px-4 py-3 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-t border-border-bronze/40">
                  <td className="px-4 py-3 text-muted">{m.order}</td>
                  <td className="px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.thumbnail}
                      alt=""
                      className="w-32 aspect-video object-cover border border-border-bronze"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{m.title}</div>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent mt-1"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3 text-muted hidden md:table-cell font-mono text-xs">
                    {m.videoId}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        m.active ? "text-emerald-300" : "text-muted/60"
                      }
                    >
                      {m.active ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setForm({
                            id: m.id,
                            url: m.url,
                            title: m.title,
                            order: m.order,
                            active: m.active,
                          })
                        }
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(m.id)}
                        aria-label="Delete"
                        className="hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {toast && <Toast message={toast.message} variant={toast.variant} />}
    </>
  );
}
