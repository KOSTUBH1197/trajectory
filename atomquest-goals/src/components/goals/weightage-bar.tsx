"use client"

import { CheckCircle2, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

const COLORS = [
  { bg: "bg-violet-500",  light: "bg-violet-500/15 text-violet-600" },
  { bg: "bg-blue-500",    light: "bg-blue-500/15 text-blue-600" },
  { bg: "bg-emerald-500", light: "bg-emerald-500/15 text-emerald-600" },
  { bg: "bg-amber-500",   light: "bg-amber-500/15 text-amber-600" },
  { bg: "bg-rose-500",    light: "bg-rose-500/15 text-rose-600" },
  { bg: "bg-cyan-500",    light: "bg-cyan-500/15 text-cyan-600" },
  { bg: "bg-orange-500",  light: "bg-orange-500/15 text-orange-600" },
  { bg: "bg-indigo-500",  light: "bg-indigo-500/15 text-indigo-600" },
]

interface WeightageBarProps {
  weightages: number[]
  titles?: string[]
}

export function WeightageBar({ weightages, titles }: WeightageBarProps) {
  const total = weightages.reduce((s, w) => s + w, 0)
  const isExact = Math.abs(total - 100) < 0.01
  const isOver  = total > 100.01

  return (
    <div className="space-y-3">
      {/* Track */}
      <div className="relative h-5 overflow-hidden rounded-full bg-muted/60 ring-1 ring-border">
        <div className="flex h-full">
          {weightages.map((w, i) => (
            <div
              key={i}
              className={cn("h-full transition-all duration-300 ease-out first:rounded-l-full", COLORS[i % COLORS.length].bg)}
              style={{ width: `${Math.min((w / Math.max(total, 100)) * 100, 100)}%` }}
              title={titles?.[i] ? `${titles[i]}: ${w}%` : `Goal ${i + 1}: ${w}%`}
            />
          ))}
          {/* Overflow flash */}
          {isOver && (
            <div className="absolute inset-y-0 right-0 w-2 bg-destructive/60 animate-pulse" />
          )}
        </div>
        {/* 100% tick mark */}
        <div className="absolute inset-y-0 right-0 w-px bg-border-strong/50" />
      </div>

      {/* Legend + total */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap gap-1.5">
          {weightages.map((w, i) => (
            <span
              key={i}
              className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", COLORS[i % COLORS.length].light)}
            >
              {titles?.[i] ? (
                <span className="max-w-[90px] truncate" title={titles[i]}>{titles[i]}</span>
              ) : (
                <span>G{i + 1}</span>
              )}
              <span className="font-mono font-bold opacity-80">{w}%</span>
            </span>
          ))}
        </div>

        {/* Total badge */}
        <div className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold font-mono ring-1",
          isExact
            ? "bg-success/10 text-success ring-success/20"
            : isOver
            ? "bg-destructive/10 text-destructive ring-destructive/20"
            : "bg-warning/10 text-warning-foreground ring-warning/20"
        )}>
          {isExact ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{total.toFixed(total % 1 === 0 ? 0 : 1)}</span>
          <span className="text-xs font-normal opacity-60">/ 100</span>
        </div>
      </div>

      {/* Validation message */}
      {!isExact && (
        <div className={cn(
          "flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs ring-1",
          isOver
            ? "bg-destructive/8 text-destructive ring-destructive/15"
            : "bg-warning/8 text-warning-foreground ring-warning/15"
        )}>
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            {isOver
              ? `Total is ${(total - 100).toFixed(1)}% over 100. Reduce some weightages before submitting.`
              : `${(100 - total).toFixed(1)}% remaining. Adjust weightages to reach exactly 100% to submit.`}
          </span>
        </div>
      )}
    </div>
  )
}
