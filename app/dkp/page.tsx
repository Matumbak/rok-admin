"use client";

import * as React from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  Trash2,
  Upload,
} from "lucide-react";
import { dkpApi } from "@/lib/api";
import { Button, Card, PageHeader, Toast } from "@/components/ui";
import { cn } from "@/lib/utils";

type UploadResult = {
  replaced: number;
  columns: string[];
  filename: string;
};

const LANDING_DKP_URL =
  (process.env.NEXT_PUBLIC_LANDING_URL ?? "http://localhost:3000") + "/dkp";

export default function DkpAdminPage() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [result, setResult] = React.useState<UploadResult | null>(null);
  const [count, setCount] = React.useState<number | null>(null);
  const [toast, setToast] = React.useState<{
    message: string;
    variant: "info" | "success" | "error";
  } | null>(null);

  const flash = (message: string, variant: "info" | "success" | "error" = "info") => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 2800);
  };

  // initial count
  React.useEffect(() => {
    let cancelled = false;
    dkpApi.list({ pageSize: 1 }).then((r) => {
      if (!cancelled) setCount(r.total);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onPick = (f: File | null) => {
    if (!f) return;
    if (!/\.(xlsx|xlsm|xls)$/i.test(f.name)) {
      flash("Only .xlsx / .xlsm / .xls files are accepted", "error");
      return;
    }
    setFile(f);
    setResult(null);
  };

  const onUpload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const r = await dkpApi.upload(file);
      setResult(r);
      setCount(r.replaced);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      flash(`Replaced with ${r.replaced} rows`, "success");
    } catch (err) {
      flash(`Upload failed: ${(err as Error).message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const onClear = async () => {
    if (
      !confirm(
        "Wipe the entire DKP table? Public landing will show the empty-state until a new file is uploaded.",
      )
    )
      return;
    setBusy(true);
    try {
      const r = await dkpApi.clearAll();
      setCount(0);
      setResult(null);
      flash(`Deleted ${r.deleted} rows`, "success");
    } catch (err) {
      flash(`Clear failed: ${(err as Error).message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="DKP Standings"
        description="Replace the entire leaderboard with a fresh DKP scan export. The previous scan is wiped — landing immediately reflects the new data."
        actions={
          <a
            href={LANDING_DKP_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-muted hover:text-accent transition-colors"
          >
            View on landing <ExternalLink className="h-4 w-4" />
          </a>
        }
      />

      <Card className="mb-6">
        <div className="flex items-start gap-3 mb-5">
          <FileSpreadsheet className="h-5 w-5 text-accent mt-0.5 shrink-0" />
          <div className="text-sm leading-relaxed">
            <div className="font-semibold text-foreground mb-1">
              DKP scan export (.xlsx)
            </div>
            <div className="text-muted">
              Drop the spreadsheet exported by your DKP tracker. The parser
              auto-detects column headers (<code>Gov ID</code>,{" "}
              <code>DKP Score</code>, <code>T4+T5 KP</code>,{" "}
              <code>All Deads</code>, …) and silently ignores any extra
              columns. Rows are re-ranked by DKP Score descending.
            </div>
          </div>
        </div>

        {/* Drop zone */}
        <label
          htmlFor="dkp-file"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onPick(e.dataTransfer.files[0] ?? null);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 border-2 border-dashed cursor-pointer p-10 transition-colors",
            dragOver
              ? "border-accent bg-accent/5"
              : "border-border-bronze/70 hover:border-accent/60",
          )}
        >
          <Upload className="h-8 w-8 text-accent" />
          <div className="text-center">
            <div className="font-semibold uppercase tracking-[0.15em] text-sm">
              {file ? file.name : "Drop .xlsx here or click to browse"}
            </div>
            <div className="text-xs text-muted mt-1">
              Max 10 MB · accepts .xlsx, .xlsm, .xls
            </div>
          </div>
          <input
            ref={inputRef}
            id="dkp-file"
            type="file"
            accept=".xlsx,.xlsm,.xls"
            className="sr-only"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-[0.25em] text-muted">
            {count == null
              ? "Loading current count…"
              : `${count} rows currently stored`}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              disabled={!file || busy}
            >
              Cancel
            </Button>
            <Button onClick={onUpload} disabled={!file || busy}>
              {busy ? "Uploading…" : "Upload & replace"}
            </Button>
          </div>
        </div>
      </Card>

      {result && (
        <Card className="mb-6 border-emerald-500/40">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-300 mt-0.5 shrink-0" />
            <div className="text-sm leading-relaxed flex-1">
              <div className="font-semibold mb-1">
                Replaced with {result.replaced} rows from{" "}
                <span className="text-accent">{result.filename}</span>
              </div>
              <div className="text-muted">
                Detected columns:{" "}
                <span className="font-mono text-xs">
                  {result.columns.join(" · ")}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-start gap-3">
          <Trash2 className="h-5 w-5 text-danger mt-0.5 shrink-0" />
          <div className="flex-1 text-sm leading-relaxed">
            <div className="font-semibold mb-1">Danger zone</div>
            <div className="text-muted mb-4">
              Clears the entire DKP table. The landing will fall back to the
              empty-state placeholder until a new file is uploaded.
            </div>
            <Button variant="danger" onClick={onClear} disabled={busy}>
              <Trash2 className="h-4 w-4" />
              Wipe all DKP rows
            </Button>
          </div>
        </div>
      </Card>

      {toast && <Toast message={toast.message} variant={toast.variant} />}
    </>
  );
}
