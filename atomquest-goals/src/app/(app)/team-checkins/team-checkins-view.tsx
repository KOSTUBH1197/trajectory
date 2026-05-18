"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Send, TrendingUp, TrendingDown, Minus, MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials, formatScore, formatDate, cn } from "@/lib/utils"
import { calculateWeightedScore } from "@/lib/scoring"
import { addCheckinComment } from "@/server/actions/checkins"
import type { User, GoalSheet, Goal, ThrustArea, Achievement, CheckinComment, GoalCycle, Quarter } from "@prisma/client"

type Report = User & {
  sheets: (GoalSheet & {
    goals: (Goal & { thrustArea: ThrustArea; achievements: Achievement[] })[]
    comments: CheckinComment[]
  })[]
}

function ScoreDisplay({ score }: { score: number | null }) {
  if (score == null) return (
    <div className="text-center">
      <Minus className="h-5 w-5 text-muted-foreground mx-auto" />
      <p className="text-xs text-muted-foreground mt-1">No data</p>
    </div>
  )
  const isGood = score >= 1.0
  const isMid  = score >= 0.75
  return (
    <div className="text-center">
      <p className={cn(
        "text-2xl font-bold font-mono leading-none",
        isGood ? "text-success" : isMid ? "text-warning" : "text-destructive"
      )}>
        {formatScore(score)}
      </p>
      <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">weighted</p>
    </div>
  )
}

function CommentThread({ sheetId, quarter, comments }: {
  sheetId: string
  quarter: Quarter
  comments: CheckinComment[]
}) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const qComments = comments.filter((c) => c.quarter === quarter)

  async function submit() {
    if (!text.trim()) return
    setSaving(true)
    const result = await addCheckinComment({ sheetId, quarter, comment: text })
    setSaving(false)
    if (result.ok) {
      setText("")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-2.5">
      {qComments.length > 0 && (
        <div className="space-y-2">
          {qComments.map((c) => (
            <div key={c.id} className="flex gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5">
              <MessageSquarePlus className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="text-xs leading-relaxed text-foreground">{c.comment}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{formatDate(c.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {expanded ? (
        <div className="flex gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a check-in comment…"
            rows={2}
            className="flex-1 text-xs resize-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit()
              if (e.key === "Escape") { setExpanded(false); setText("") }
            }}
          />
          <div className="flex flex-col gap-1">
            <Button size="icon" className="h-8 w-8" onClick={submit} disabled={saving || !text.trim()}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setExpanded(false); setText("") }}>
              ✕
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          {qComments.length === 0 ? "Add comment" : "Add another comment"}
        </button>
      )}
    </div>
  )
}

export function TeamCheckinsView({ reports, cycle, currentUserId }: {
  reports: Report[]
  cycle: GoalCycle
  currentUserId: string
}) {
  const quarters = ["Q1", "Q2", "Q3", "Q4"] as Quarter[]

  return (
    <Tabs defaultValue="Q1">
      <TabsList className="h-10">
        {quarters.map((q) => <TabsTrigger key={q} value={q} className="px-6">{q}</TabsTrigger>)}
      </TabsList>

      {quarters.map((q) => (
        <TabsContent key={q} value={q} className="mt-5 space-y-4">
          {reports.map((report) => {
            const sheet = report.sheets[0]
            if (!sheet) return null

            const weightedScore = calculateWeightedScore(
              sheet.goals.map((g) => ({
                weightage: g.weightage,
                uomType: g.uomType,
                targetNumeric: g.targetNumeric,
                targetDate: g.targetDate,
                achievements: g.achievements,
              })),
              q
            )

            const completedGoals = sheet.goals.filter((g) =>
              g.achievements.some((a) => a.quarter === q && a.status === "COMPLETED")
            ).length

            return (
              <Card key={report.id} className="overflow-hidden">
                {/* Header */}
                <CardHeader className="border-b py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 ring-2 ring-border">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {getInitials(report.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm leading-tight">{report.name}</p>
                        <p className="text-xs text-muted-foreground">{report.department ?? report.email}</p>
                      </div>
                    </div>
                    <ScoreDisplay score={weightedScore} />
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {/* Goals */}
                  <div className="divide-y divide-border/50">
                    {sheet.goals.map((goal) => {
                      const ach = goal.achievements.find((a) => a.quarter === q)
                      const score = ach?.score ?? null
                      const isGood = score != null && score >= 1.0
                      const isMid  = score != null && score >= 0.75
                      return (
                        <div key={goal.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                          <div className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            isGood ? "bg-success" : isMid ? "bg-warning" : score != null ? "bg-destructive" : "bg-muted-foreground/30"
                          )} />
                          <p className="flex-1 text-sm truncate">{goal.title}</p>
                          <div className="flex items-center gap-3 shrink-0">
                            {ach && (
                              <span className={cn(
                                "text-[10px] font-medium rounded-full px-2 py-0.5 border",
                                ach.status === "COMPLETED"  ? "bg-success/10 text-success border-success/20" :
                                ach.status === "ON_TRACK"   ? "bg-warning/10 text-warning-foreground border-warning/20" :
                                "bg-muted text-muted-foreground border-border"
                              )}>
                                {ach.status.replace("_", " ")}
                              </span>
                            )}
                            <span className={cn(
                              "font-mono text-sm font-bold w-12 text-right",
                              isGood ? "text-success" : isMid ? "text-warning" : score != null ? "text-destructive" : "text-muted-foreground"
                            )}>
                              {score != null ? formatScore(score) : "—"}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Comments */}
                  <div className="border-t px-5 py-4 bg-muted/20">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                      Manager Notes
                    </p>
                    <CommentThread
                      sheetId={sheet.id}
                      quarter={q}
                      comments={sheet.comments}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>
      ))}
    </Tabs>
  )
}
