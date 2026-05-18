"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Save, TrendingUp, Lock, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getUomLabel, formatScore, formatDate, cn } from "@/lib/utils"
import { upsertAchievement } from "@/server/actions/achievements"
import type { GoalSheet, Goal, ThrustArea, Achievement, GoalCycle, AchievementStatus, Quarter } from "@prisma/client"

type SheetWithGoals = GoalSheet & {
  goals: (Goal & { thrustArea: ThrustArea; achievements: Achievement[] })[]
}

const STATUS_OPTIONS: { value: AchievementStatus; label: string; color: string }[] = [
  { value: "NOT_STARTED", label: "Not Started", color: "text-muted-foreground" },
  { value: "ON_TRACK",    label: "On Track",    color: "text-warning-foreground" },
  { value: "COMPLETED",  label: "Completed",   color: "text-success" },
]

function ScorePill({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-xs text-muted-foreground">—</span>
  const isGood = score >= 1.0
  const isMid  = score >= 0.75
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold font-mono",
      isGood ? "bg-success/12 text-success" : isMid ? "bg-warning/12 text-warning-foreground" : "bg-destructive/10 text-destructive"
    )}>
      <TrendingUp className="h-3 w-3" />
      {formatScore(score)}
    </span>
  )
}

function GoalCheckinRow({ goal, quarter, open }: {
  goal: Goal & { thrustArea: ThrustArea; achievements: Achievement[] }
  quarter: Quarter
  open: boolean
}) {
  const router = useRouter()
  const existing = goal.achievements.find((a) => a.quarter === quarter)
  const [saving, setSaving] = useState(false)
  const [actualNumeric, setActualNumeric] = useState<number | null>(existing?.actualNumeric ?? null)
  const [actualDate, setActualDate] = useState(
    existing?.actualDate ? new Date(existing.actualDate).toISOString().split("T")[0] : ""
  )
  const [status, setStatus] = useState<AchievementStatus>(existing?.status ?? "NOT_STARTED")

  const isTimeline = goal.uomType === "TIMELINE"
  const isZero     = goal.uomType === "ZERO"
  const isPercent  = goal.uomType.includes("PERCENT")

  async function handleSave() {
    setSaving(true)
    const result = await upsertAchievement({
      goalId: goal.id,
      quarter,
      actualNumeric: isZero ? 0 : isTimeline ? null : actualNumeric,
      actualDate: isTimeline ? actualDate || null : null,
      status,
    })
    setSaving(false)
    if (result.ok) {
      toast.success(`${quarter} saved — score: ${formatScore(result.data?.score ?? null)}`)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      open ? "bg-card hover:border-border-strong" : "bg-muted/30 opacity-70"
    )}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{goal.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 rounded-full border border-border px-2 py-0.5">
              {goal.thrustArea.name}
            </span>
            <span className="text-[10px] text-muted-foreground">{getUomLabel(goal.uomType)}</span>
            <span className="text-[10px] font-mono font-semibold text-muted-foreground">
              Target: {isTimeline ? formatDate(goal.targetDate) : isZero ? "0" : `${goal.targetNumeric}${isPercent ? "%" : ""}`}
            </span>
          </div>
        </div>
        <ScorePill score={existing?.score} />
      </div>

      {!open ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          Window closed
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Actual input */}
          {isZero ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Incidents</Label>
              <Input
                type="number"
                min="0"
                value={actualNumeric ?? 0}
                onChange={(e) => setActualNumeric(Number(e.target.value))}
                className="h-9"
              />
            </div>
          ) : isTimeline ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Completion Date</Label>
              <Input
                type="date"
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
                className="h-9"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Actual {isPercent ? "(%)" : "Value"}
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  value={actualNumeric ?? ""}
                  onChange={(e) => setActualNumeric(e.target.value === "" ? null : Number(e.target.value))}
                  className={cn("h-9", isPercent && "pr-7")}
                />
                {isPercent && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AchievementStatus)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className={s.color}>{s.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="w-full h-9 gap-1.5"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function CheckinsEditor({ sheet, cycle, openQuarters }: {
  sheet: SheetWithGoals
  cycle: GoalCycle
  openQuarters: Quarter[]
}) {
  const quarters = ["Q1", "Q2", "Q3", "Q4"] as Quarter[]

  return (
    <Tabs defaultValue={openQuarters[0] ?? "Q1"}>
      <TabsList className="h-10">
        {quarters.map((q) => {
          const isOpen = openQuarters.includes(q)
          const hasData = sheet.goals.some((g) => g.achievements.some((a) => a.quarter === q))
          return (
            <TabsTrigger key={q} value={q} className="gap-2 px-5">
              {q}
              {isOpen && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
              {!isOpen && hasData && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
            </TabsTrigger>
          )
        })}
      </TabsList>

      {quarters.map((q) => {
        const isOpen = openQuarters.includes(q)
        return (
          <TabsContent key={q} value={q} className="mt-5 space-y-3">
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
              isOpen
                ? "bg-success/8 text-success border border-success/15"
                : "bg-muted/60 text-muted-foreground"
            )}>
              {isOpen ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {isOpen
                ? `${q} check-in window is open — enter your actuals below`
                : `${q} check-in window is closed`}
            </div>
            <div className="space-y-2.5">
              {sheet.goals.map((goal) => (
                <GoalCheckinRow key={goal.id} goal={goal} quarter={q} open={isOpen} />
              ))}
            </div>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
