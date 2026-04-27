"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md";
  }
>(({ className, variant = "primary", size = "md", ...props }, ref) => {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.12em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-5 text-sm",
  };
  const variants = {
    primary:
      "bg-accent text-background-deep hover:bg-accent-bright shadow-[inset_0_1px_0_rgba(255,200,150,0.35)]",
    outline:
      "border border-accent/60 text-accent hover:bg-accent hover:text-background-deep",
    ghost: "text-muted hover:text-foreground",
    danger:
      "border border-danger/60 text-danger hover:bg-danger hover:text-foreground",
  };
  return (
    <button
      ref={ref}
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    />
  );
});
Button.displayName = "Button";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 px-3 w-full bg-background-deep border border-border-bronze focus:outline-none focus:border-accent text-foreground placeholder:text-muted/60 text-sm",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "px-3 py-2 w-full bg-background-deep border border-border-bronze focus:outline-none focus:border-accent text-foreground placeholder:text-muted/60 text-sm min-h-[80px]",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-10 px-3 w-full bg-background-deep border border-border-bronze focus:outline-none focus:border-accent text-foreground text-sm",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({
  children,
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "block text-xs uppercase tracking-[0.18em] text-muted mb-1.5",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card/80 border border-border-bronze/70 p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-[0.04em] uppercase text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-muted max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Toast({
  message,
  variant = "info",
}: {
  message: string;
  variant?: "info" | "success" | "error";
}) {
  const colors = {
    info: "border-accent/60 text-accent",
    success: "border-emerald-500/60 text-emerald-300",
    error: "border-danger/70 text-danger",
  };
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 px-4 py-3 bg-card border text-sm shadow-xl",
        colors[variant],
      )}
    >
      {message}
    </div>
  );
}
