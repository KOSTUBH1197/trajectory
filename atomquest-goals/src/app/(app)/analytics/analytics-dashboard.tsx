"use client"

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, ReferenceLine,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { calculateWeightedScore } from "@/lib/scoring"
import { formatScore, cn } from "@/lib/utils"
import type { GoalSheet, Goal, ThrustArea, Achievement, GoalCycle, User } from "@prisma/client"

type Sheet = GoalSheet & {
  employee: User & { manager: { id: string; name: string } | null }
  goals: (Goal & { thrustArea: ThrustArea; achievements: Achievement[] })[]
}

const CHART_COLORS = [
  "oklch(0.52 0.24 263)",
  "oklch(0.62 0.18 145)",
  "oklch(0.73 0.17 75)",
  "oklch(0.54 0.22 27)",
  "oklch(0.55 0.22 300)",
  "oklch(0.52 0.24 210)",
]

const CustomTooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid oklch(0.91 0 0)",
  background: "oklch(1 0 0)",
  color: "oklch(0.18 0 0)",
  boxShadow: "0 4px 12px oklch(0 0 0 / 0.08)",
}

export function AnalyticsDashboard({ sheets, thrustAreas, cycle }: {
  sheets: Sheet[]
  thrustAreas: ThrustArea[]
  cycle: GoalCycle
}) {
  const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const

  // QoQ data
  const qoqData = QUARTERS.map((q) => {
    const scores = sheets
      .map((s) => calculateWeightedScore(
        s.goals.map((g) => ({ weightage: g.weightage, uomType: g.uomType, targetNumeric: g.targetNumeric, targetDate: g.targetDate, achievements: g.achievements })),
        q
      ))
      .filter((s): s is number => s !== null)
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    return {
      quarter: q,
      avgScore: avg != null ? Math.round(avg * 1000) / 10 : null,
      count: scores.length,
    }
  })

  // Thrust area distribution
  const taData = thrustAreas
    .map((ta) => ({
      name: ta.name.length > 22 ? ta.name.slice(0, 20) + "…" : ta.name,
      fullName: ta.name,
      goals: sheets.flatMap((s) => s.goals).filter((g) => g.thrustAreaId === ta.id).length,
    }))
    .filter((d) => d.goals > 0)
    .sort((a, b) => b.goals - a.goals)

  // Manager effectiveness
  const managerMap = new Map<string, { name: string; quarters: Record<string, { total: number; done: number }> }>()
  for (const sheet of sheets) {
    const mgr = sheet.employee.manager
    if (!mgr) continue
    if (!managerMap.has(mgr.id)) managerMap.set(mgr.id, { name: mgr.name, quarters: {} })
    const entry = managerMap.get(mgr.id)!
    for (const q of QUARTERS) {
      if (!entry.quarters[q]) entry.quarters[q] = { total: 0, done: 0 }
      entry.quarters[q].total++
      if (sheet.goals.some((g) => g.achievements.some((a) => a.quarter === q && a.status !== "NOT_STARTED")))
        entry.quarters[q].done++
    }
  }
  const heatmapData = QUARTERS.map((q) => {
    const row: Record<string, string | number> = { quarter: q }
    for (const [, mgr] of managerMap)
      row[mgr.name] = managerMap.size > 0
        ? Math.round((mgr.quarters[q]?.done ?? 0) / Math.max(mgr.quarters[q]?.total ?? 1, 1) * 100)
        : 0
    return row
  })
  const managerNames = [...managerMap.values()].map((m) => m.name)

  // Summary stats
  const allScores = sheets.flatMap((s) =>
    QUARTERS.map((q) => calculateWeightedScore(
      s.goals.map((g) => ({ weightage: g.weightage, uomType: g.uomType, targetNumeric: g.targetNumeric, targetDate: g.targetDate, achievements: g.achievements })),
      q
    )).filter((sc): sc is number => sc !== null)
  )
  const avgScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null
  const aboveTarget = allScores.filter((s) => s >= 1.0).length
  const pctAbove = allScores.length > 0 ? Math.round((aboveTarget / allScores.length) * 100) : 0

  return (
    <div className="space-y-6 page-enter">
      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Approved Sheets",    value: sheets.length,             suffix: "", desc: "In active cycle" },
          { label: "Avg Achievement",    value: avgScore != null ? `${(avgScore * 100).toFixed(1)}%` : "—", suffix: "", desc: "Across all quarters" },
          { label: "On/Above Target",    value: `${pctAbove}%`,            suffix: "", desc: `${aboveTarget} of ${allScores.length} check-ins` },
        ].map((s) => (
          <Card key={s.label} className="relative overflow-hidden">
            <div className="absolute right-0 top-0 h-14 w-14 rounded-bl-2xl bg-primary/5" />
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="text-3xl font-bold font-mono mt-1">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* QoQ Line chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quarter-over-Quarter Achievement</CardTitle>
          <CardDescription>Average weighted score across all employees per quarter</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={qoqData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                domain={[0, 150]}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine y={100} stroke="oklch(0.62 0.18 145)" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Target 100%", position: "right", fontSize: 10, fill: "oklch(0.62 0.18 145)" }} />
              <Tooltip
                formatter={(v) => [`${Number(v).toFixed(1)}%`, "Avg Score"]}
                contentStyle={CustomTooltipStyle}
              />
              <Line
                type="monotone"
                dataKey="avgScore"
                stroke={CHART_COLORS[0]}
                strokeWidth={2.5}
                dot={{ r: 5, fill: CHART_COLORS[0], strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 7 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Thrust area distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Goals by Thrust Area</CardTitle>
            <CardDescription>Distribution across strategic pillars</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={taData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CustomTooltipStyle} formatter={(v) => [v, "Goals"]} />
                <Bar dataKey="goals" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {taData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Manager effectiveness */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manager Effectiveness</CardTitle>
            <CardDescription>% of team with check-ins logged per quarter</CardDescription>
          </CardHeader>
          <CardContent>
            {managerNames.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No manager data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={heatmapData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
                  <XAxis dataKey="quarter" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v, name) => [`${Number(v)}%`, String(name)]}
                    contentStyle={CustomTooltipStyle}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {managerNames.map((name, i) => (
                    <Bar key={name} dataKey={name} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Individual scores table */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Individual Scores</CardTitle>
          <CardDescription>Weighted achievement per quarter for each employee</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Employee</th>
                {QUARTERS.map((q) => (
                  <th key={q} className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{q}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {sheets.map((sheet) => {
                const scores = QUARTERS.map((q) => calculateWeightedScore(
                  sheet.goals.map((g) => ({ weightage: g.weightage, uomType: g.uomType, targetNumeric: g.targetNumeric, targetDate: g.targetDate, achievements: g.achievements })),
                  q
                ))
                return (
                  <tr key={sheet.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium leading-tight">{sheet.employee.name}</p>
                      <p className="text-xs text-muted-foreground">{sheet.employee.department ?? sheet.employee.email}</p>
                    </td>
                    {scores.map((score, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        {score == null ? (
                          <span className="text-muted-foreground/40">—</span>
                        ) : (
                          <span className={cn(
                            "inline-block font-mono font-bold text-sm rounded-md px-2 py-0.5",
                            score >= 1.0 ? "bg-success/10 text-success" :
                            score >= 0.75 ? "bg-warning/10 text-warning-foreground" :
                            "bg-destructive/10 text-destructive"
                          )}>
                            {formatScore(score)}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
