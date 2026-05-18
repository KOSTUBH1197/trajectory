import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getActiveCycle } from "@/lib/cycle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Target, CheckSquare, ClipboardCheck, ArrowRight, TrendingUp, Sparkles, Bell, AlertCircle } from "lucide-react"
import { getStatusColor, formatDate, formatScore, cn } from "@/lib/utils"
import { calculateWeightedScore } from "@/lib/scoring"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user

  const cycle = await getActiveCycle()

  const mySheet = cycle
    ? await db.goalSheet.findUnique({
        where: { employeeId_cycleId: { employeeId: user.id, cycleId: cycle.id } },
        include: {
          goals: { include: { thrustArea: true, achievements: { orderBy: { quarter: "asc" } } } },
        },
      })
    : null

  const quarters = ["Q1", "Q2", "Q3", "Q4"] as const
  const scores = quarters.map((q) => ({
    quarter: q,
    score: mySheet
      ? calculateWeightedScore(
          mySheet.goals.map((g) => ({
            weightage: g.weightage,
            uomType: g.uomType,
            targetNumeric: g.targetNumeric,
            targetDate: g.targetDate,
            achievements: g.achievements,
          })),
          q
        )
      : null,
  }))

  const notifications = await db.notification.findMany({
    where: { userId: user.id, read: false },
    orderBy: { createdAt: "desc" },
    take: 4,
  })

  const pendingCount =
    user.role === "MANAGER" || user.role === "ADMIN"
      ? await db.goalSheet.count({
          where: {
            status: "SUBMITTED",
            ...(user.role === "MANAGER" ? { employee: { managerId: user.id } } : {}),
          },
        })
      : 0

  const firstName = user.name.split(" ")[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div className="space-y-8 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{greeting}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{firstName} 👋</h1>
          {cycle && (
            <p className="text-sm text-muted-foreground">
              Active cycle: <span className="font-medium text-foreground">{cycle.name}</span>
            </p>
          )}
        </div>
        {pendingCount > 0 && (
          <Link href="/approvals">
            <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-sm text-warning-foreground transition-colors hover:bg-warning/12">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">{pendingCount} pending approval{pendingCount !== 1 ? "s" : ""}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        )}
      </div>

      {/* Goal sheet CTA */}
      {!mySheet && cycle && (
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-6">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/8 blur-2xl" />
          <div className="relative flex items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-primary">Set your goals for {cycle.name}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                You haven't created a goal sheet yet. Start now to align with your team's objectives.
              </p>
            </div>
            <Button asChild className="shrink-0 shadow-sm shadow-primary/20">
              <Link href="/goals">
                Create Goal Sheet
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Metric grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Goals card */}
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-3xl bg-primary/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Goals</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {mySheet ? (
              <div className="space-y-1.5">
                <p className="text-3xl font-bold font-mono">{mySheet.goals.length}</p>
                <Badge className={cn("text-xs", getStatusColor(mySheet.status))}>{mySheet.status}</Badge>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-3xl font-bold text-muted-foreground">—</p>
                <p className="text-xs text-muted-foreground">No sheet yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quarter score cards */}
        {scores.map(({ quarter, score }, i) => {
          const isGood = score != null && score >= 1.0
          const isMid  = score != null && score >= 0.75 && score < 1.0
          const isBad  = score != null && score < 0.75

          return (
            <Card key={quarter} className="relative overflow-hidden">
              <div className={cn(
                "absolute right-0 top-0 h-16 w-16 rounded-bl-3xl",
                isGood ? "bg-success/8" : isMid ? "bg-warning/8" : isBad ? "bg-destructive/8" : "bg-muted/50"
              )} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{quarter} Score</CardTitle>
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  isGood ? "bg-success/12" : isMid ? "bg-warning/12" : isBad ? "bg-destructive/10" : "bg-muted"
                )}>
                  <TrendingUp className={cn(
                    "h-4 w-4",
                    isGood ? "text-success" : isMid ? "text-warning" : isBad ? "text-destructive" : "text-muted-foreground"
                  )} />
                </div>
              </CardHeader>
              <CardContent>
                <p className={cn(
                  "text-3xl font-bold font-mono",
                  isGood ? "text-success" : isMid ? "text-warning" : isBad ? "text-destructive" : "text-muted-foreground"
                )}>
                  {score == null ? "—" : formatScore(score)}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">Weighted achievement</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* My goals progress */}
        {mySheet && mySheet.goals.length > 0 && (
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Goal Progress</h2>
              <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
                <Link href="/checkins">View check-ins →</Link>
              </Button>
            </div>
            <div className="space-y-2">
              {mySheet.goals.slice(0, 5).map((goal) => {
                const latestAch = goal.achievements.at(-1)
                return (
                  <div key={goal.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{goal.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{goal.thrustArea.name} · {goal.weightage}%</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {latestAch?.score != null ? (
                        <p className={cn(
                          "text-sm font-bold font-mono",
                          latestAch.score >= 1.0 ? "text-success" : latestAch.score >= 0.75 ? "text-warning" : "text-destructive"
                        )}>
                          {formatScore(latestAch.score)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">No data</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Notifications</h2>
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
                <Link href="/notifications">View all →</Link>
              </Button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">All caught up</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-lg border-l-2 border-l-primary bg-card border border-border p-3">
                  <p className="text-xs font-semibold">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">{formatDate(n.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
