"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { requirementsApi } from "@/lib/api";
import type { Requirement } from "@/lib/types";
import {
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  Select,
  Textarea,
  Toast,
} from "@/components/ui";

const ICON_OPTIONS = [
  "Crown",
  "Swords",
  "Target",
  "Flame",
  "Shield",
  "Trophy",
  "Zap",
  "Skull",
  "Users",
];

type FormState = {
  id?: string;
  title: string;
  description: string;
  iconKey: string;
  order: number;
  active: boolean;
};

const EMPTY: FormState = {
  title: "",
  description: "",
  iconKey: "Crown",
  order: 0,
  active: true,
};

export default function RequirementsPage() {
  const [items, setItems] = React.useState<Requirement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState<FormState | null>(null);
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
      const { items } = await requirementsApi.listAdmin();
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
        await requirementsApi.update(form.id, form);
        flash("Updated", "success");
      } else {
        await requirementsApi.create(form);
        flash("Created", "success");
      }
      setForm(null);
      refresh();
    } catch (err) {
      flash(`Save failed: ${(err as Error).message}`, "error");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this requirement?")) return;
    try {
      await requirementsApi.remove(id);
      flash("Deleted", "success");
      refresh();
    } catch (err) {
      flash(`Delete failed: ${(err as Error).message}`, "error");
    }
  };

  return (
    <>
      <PageHeader
        title="Migration Requirements"
        description="Bullets shown on the landing’s Migration page. Order controls vertical position; inactive items are hidden from public visitors."
        actions={
          <Button onClick={() => setForm({ ...EMPTY })}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        }
      />

      {form && (
        <Card className="mb-6">
          <h2 className="text-sm uppercase tracking-[0.2em] text-accent mb-4">
            {form.id ? "Edit requirement" : "New requirement"}
          </h2>
          <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="iconKey">Icon</Label>
              <Select
                id="iconKey"
                value={form.iconKey}
                onChange={(e) =>
                  setForm({ ...form, iconKey: e.target.value })
                }
              >
                {ICON_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
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
            <div className="md:col-span-2 flex items-center gap-2">
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
                Active (visible on landing)
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
          <div className="p-8 text-center text-muted">No requirements yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-background-deep/60">
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-accent">
                <th className="px-4 py-3 w-16">#</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3 hidden md:table-cell">Description</th>
                <th className="px-4 py-3 w-28">Icon</th>
                <th className="px-4 py-3 w-20">Active</th>
                <th className="px-4 py-3 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t border-border-bronze/40">
                  <td className="px-4 py-3 text-muted">{r.order}</td>
                  <td className="px-4 py-3 font-semibold">{r.title}</td>
                  <td className="px-4 py-3 text-muted hidden md:table-cell line-clamp-2">
                    {r.description}
                  </td>
                  <td className="px-4 py-3 text-muted">{r.iconKey}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.active ? "text-emerald-300" : "text-muted/60"
                      }
                    >
                      {r.active ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setForm({
                            id: r.id,
                            title: r.title,
                            description: r.description,
                            iconKey: r.iconKey,
                            order: r.order,
                            active: r.active,
                          })
                        }
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(r.id)}
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
