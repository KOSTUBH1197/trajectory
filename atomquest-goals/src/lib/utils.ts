import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatScore(score: number | null | undefined): string {
  if (score == null) return "—"
  return `${(score * 100).toFixed(1)}%`
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    SUBMITTED: "bg-warning/20 text-warning-foreground border-warning/30",
    APPROVED: "bg-success/20 text-success border-success/30",
    RETURNED: "bg-destructive/20 text-destructive border-destructive/30",
    NOT_STARTED: "bg-muted text-muted-foreground",
    ON_TRACK: "bg-warning/20 text-warning-foreground",
    COMPLETED: "bg-success/20 text-success",
    ACTIVE: "bg-success/20 text-success",
    CLOSED: "bg-muted text-muted-foreground",
  }
  return map[status] ?? "bg-muted text-muted-foreground"
}

export function getUomLabel(uomType: string): string {
  const map: Record<string, string> = {
    NUMERIC_MIN: "Numeric (Higher is better)",
    NUMERIC_MAX: "Numeric (Lower is better)",
    PERCENT_MIN: "Percentage (Higher is better)",
    PERCENT_MAX: "Percentage (Lower is better)",
    TIMELINE: "Timeline (Date target)",
    ZERO: "Zero Tolerance",
  }
  return map[uomType] ?? uomType
}
