"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Crown, LogOut, Shield, Trophy, Users, Video } from "lucide-react";
import { checkAuth, tokenStorage } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/kingdom-stats", label: "Stats", icon: Crown },
  { href: "/requirements", label: "Migration", icon: Users },
  { href: "/media", label: "Media", icon: Video },
  { href: "/dkp", label: "DKP", icon: Trophy },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = React.useState<
    "checking" | "in" | "out"
  >("checking");

  React.useEffect(() => {
    let mounted = true;
    const t = tokenStorage.get();
    if (!t) {
      if (mounted) setAuthState("out");
      return;
    }
    checkAuth().then((ok) => {
      if (!mounted) return;
      setAuthState(ok ? "in" : "out");
    });
    return () => {
      mounted = false;
    };
  }, [pathname]);

  if (pathname === "/login") {
    return <main className="flex-1">{children}</main>;
  }

  if (authState === "checking") {
    return (
      <main className="flex-1 flex items-center justify-center text-muted">
        <span className="font-semibold tracking-widest uppercase text-sm">
          Loading…
        </span>
      </main>
    );
  }

  if (authState === "out") {
    if (typeof window !== "undefined") router.replace("/login");
    return null;
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-border-bronze/60 bg-card/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <Shield className="h-5 w-5 text-accent" />
            <span className="font-semibold tracking-[0.25em] uppercase text-sm">
              4028 <span className="text-accent">Admin</span>
            </span>
          </Link>

          <nav className="flex items-center gap-2 md:gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 h-9 text-sm uppercase tracking-[0.15em] transition-colors border",
                    active
                      ? "border-accent text-accent bg-accent/10"
                      : "border-transparent text-muted hover:text-foreground hover:border-border-bronze",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => {
              tokenStorage.clear();
              router.replace("/login");
            }}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted hover:text-danger transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
