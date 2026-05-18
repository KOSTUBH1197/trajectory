import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getActiveCycle } from "@/lib/cycle"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, ArrowRight, CheckCircle2, Clock, FileText, AlertCircle } from "lucide-react"
import { getInitials, formatDate, cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const STATUS_CONFIG = {
  APPROVED:  { label: "Approved",  color: "bg-success/10 text-success border-success/20",          icon: CheckCircle2 },
  SUBMITTED: { label: "Submitted", color: "bg-warning/10 text-warning-foreground border-warning/20", icon: Clock },
  DRAFT:     { label: "Draft",     color: "bg-muted text-muted-foreground border-border",            icon: FileText },
  RETURNED:  { label: "Returned",  color: "bg-destructive/10 text-destructive border-destructive/20",icon: AlertCircle },
  NONE:      { label: "No sheet",  color: "bg-muted text-muted-foreground border-border",            icon: AlertCircle },
} as const

export default async function TeamPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role === "EMPLOYEE") redirect("/dashboard")
  const user = session.user

  const cycle = await getActiveCycle()

  const reports = await db.user.findMany({
    where: user.role === "MANAGER" ? { managerId: user.id } : {},
    include: {
      sheets: {
        where: cycle ? { cycleId: cycle.id } : {},
        include: { goals: true, cycle: true },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  })

  const approved  = reports.filter((r) => r.sheets[0]?.status === "APPROVED").length
  const submitted = reports.filter((r) => r.sheets[0]?.status === "SUBMITTED").length
  const draft     = reports.filter((r) => r.sheets[0]?.status === "DRAFT").length
  const none      = reports.filter((r) => !r.sheets[0]).length

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {reports.length} direct report{reports.length !== 1 ? "s" : ""}
          {cycle && ` · ${cycle.name}`}
        </p>
      </div>

      {/* Summary chips */}
      {reports.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Approved",  count: approved,  color: "bg-success/10 text-success border-success/20" },
            { label: "Submitted", count: submitted, color: "bg-warning/10 text-warning-foreground border-warning/20" },
            { label: "Draft",     count: draft,     color: "bg-muted text-muted-foreground border-border" },
            { label: "No sheet",  count: none,      color: "bg-muted text-muted-foreground border-border" },
          ].filter((s) => s.count > 0).map((s) => (
            <div key={s.label} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", s.color)}>
              <span className="font-bold font-mono">{s.count}</span>
              {s.label}
            </div>
          ))}
        </div>
      )}

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Users className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-semibold">No reports found</p>
            <p className="mt-1 text-sm text-muted-foreground">No direct reports assigned to you yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => {
            const sheet = r.sheets[0]
            const status = sheet?.status ?? "NONE"
            const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.NONE
            const StatusIcon = cfg.icon

            return (
              <Card key={r.id} className="group relative hover:shadow-md transition-all duration-150 hover:border-border-strong">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-border">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {getInitials(r.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm leading-tight">{r.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.department ?? r.email}</p>
                      </div>
                    </div>
                    {sheet && (
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="h-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Link href={`/approvals/${sheet.id}`}>
                          View <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                      cfg.color
                    )}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </div>
                    {sheet && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {sheet.goals.length} goal{sheet.goals.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {sheet?.updatedAt && (
                    <p className="mt-2 text-[10px] text-muted-foreground/60">
                      Updated {formatDate(sheet.updatedAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
