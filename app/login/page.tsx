"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { checkAuth, tokenStorage } from "@/lib/api";
import { Button, Card, Input, Label } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [token, setToken] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setBusy(true);
    setError(null);
    tokenStorage.set(token.trim());
    const ok = await checkAuth();
    if (ok) {
      router.replace("/requirements");
    } else {
      tokenStorage.clear();
      setError("Token rejected — check your ADMIN_TOKEN in the API .env");
      setBusy(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-accent" />
          <h1 className="text-xl font-semibold tracking-[0.2em] uppercase">
            4028 Admin
          </h1>
        </div>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          Enter the admin token defined in{" "}
          <code className="text-accent">rok-api/.env</code> →{" "}
          <code className="text-accent">ADMIN_TOKEN</code>.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="token">Admin token</Label>
            <Input
              id="token"
              type="password"
              autoFocus
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="huns-4028-…"
            />
          </div>
          {error && (
            <p className="text-sm text-danger border border-danger/40 px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Verifying…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
