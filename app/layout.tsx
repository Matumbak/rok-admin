import type { Metadata } from "next";
import "./globals.css";
import { AdminShell } from "@/components/AdminShell";

export const metadata: Metadata = {
  title: "4028 HUNS — Admin",
  description: "Admin panel for the 4028 Huns landing.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen flex flex-col">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
