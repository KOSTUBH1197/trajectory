"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDate, getInitials, cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChevronLeft, ChevronRight, GitCompare, Shield } from "lucide-react"
import type { AuditLog } from "@prisma/client"

const ACTION_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  CREATE:  { label: "Created",  color: "bg-success/10 text-success border-success/20",         dot: "bg-success" },
  UPDATE:  { label: "Updated",  color: "bg-primary/10 text-primary border-primary/20",          dot: "bg-primary" },
  DELETE:  { label: "Deleted",  color: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  APPROVE: { label: "Approved", color: "bg-success/10 text-success border-success/20",          dot: "bg-success" },
  RETURN:  { label: "Returned", color: "bg-warning/10 text-warning-foreground border-warning/20", dot: "bg-warning" },
  SUBMIT:  { label: "Submitted",color: "bg-primary/10 text-primary border-primary/20",          dot: "bg-primary/60" },
  UNLOCK:  { label: "Unlocked", color: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
}

function DiffViewer({ before, after }: { before: unknown; after: unknown }) {
  const b = before as Record<string, unknown> ?? {}
  const a = after  as Record<string, unknown> ?? {}
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])]
  const changed = keys.filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]))

  if (changed.length === 0) return (
    <p className="text-xs text-muted-foreground py-4 text-center">No field changes detected</p>
  )

  return (
    <div className="space-y-2">
      {changed.map((k) => (
        <div key={k} className="rounded-lg border overflow-hidden">
          <div className="bg-muted/50 px-3 py-1.5">
            <p className="text-xs font-mono font-semibold text-muted-foreground">{k}</p>
          </div>
          <div className="divide-y">
            {b[k] !== undefined && (
              <div className="flex items-start gap-2 bg-destructive/5 px-3 py-2">
                <span className="text-destructive text-xs font-bold font-mono mt-0.5">−</span>
                <code className="text-xs font-mono text-destructive break-all">{JSON.stringify(b[k])}</code>
              </div>
            )}
            {a[k] !== undefined && (
              <div className="flex items-start gap-2 bg-success/5 px-3 py-2">
                <span className="text-success text-xs font-bold font-mono mt-0.5">+</span>
                <code className="text-xs font-mono text-success break-all">{JSON.stringify(a[k])}</code>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

interface AuditLogViewProps {
  logs: AuditLog[]
  actorMap: Record<string, { name: string; email: string }>
  entityTypes: string[]
  currentEntityType?: string
  page: number
  pageSize: number
  total: number
}

export function AuditLogView({ logs, actorMap, entityTypes, currentEntityType, page, pageSize, total }: AuditLogViewProps) {
  const router = useRouter()
  const [diffEntry, setDiffEntry] = useState<AuditLog | null>(null)

  function setFilter(entityType: string) {
    const p = new URLSearchParams()
    if (entityType !== "all") p.set("entityType", entityType)
    p.set("page", "1")
    router.push(`?${p.toString()}`)
  }

  function setPage(p: number) {
    const params = new URLSearchParams()
    if (currentEntityType) params.set("entityType", currentEntityType)
    params.set("page", String(p))
    router.push(`?${params.toString()}`)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <Select value={currentEntityType ?? "all"} onValueChange={setFilter}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue placeholder="All entity types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {entityTypes.map((et) => <SelectItem key={et} value={et}>{et}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{total.toLocaleString()} entries</p>
      </div>

      {/* Timeline */}
      <Card className="overflow-hidden">
        {logs.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Shield className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-semibold">No audit entries</p>
          </CardContent>
        ) : (
          <div className="divide-y divide-border/50">
            {logs.map((log) => {
              const actor = actorMap[log.actorId]
              const cfg = ACTION_CONFIG[log.action] ?? { label: log.action, color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" }
              const hasDiff = !!(log.before || log.after)

              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors group">
                  {/* Actor avatar */}
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5 ring-1 ring-border">
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                      {actor ? getInitials(actor.name) : "?"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{actor?.name ?? log.actorId}</span>
                      <div className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", cfg.color)}>
                        {cfg.label}
                      </div>
                      <span className="text-xs text-muted-foreground">{log.entityType}</span>
                      <code className="text-[10px] font-mono text-muted-foreground/60 bg-muted rounded px-1">
                        {log.entityId.slice(0, 8)}
                      </code>
                    </div>
                    {log.reason && (
                      <p className="text-xs text-muted-foreground italic">
                        "{log.reason}"
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60">{formatDate(log.createdAt)}</p>
                  </div>

                  {/* Diff button */}
                  {hasDiff && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setDiffEntry(log)}
                      aria-label="View diff"
                    >
                      <GitCompare className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Diff modal */}
      <Dialog open={!!diffEntry} onOpenChange={(o) => !o && setDiffEntry(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              Change Diff — {diffEntry?.action} {diffEntry?.entityType}
            </DialogTitle>
          </DialogHeader>
          {diffEntry && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {diffEntry.reason && (
                <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground italic">
                  Reason: "{diffEntry.reason}"
                </div>
              )}
              <DiffViewer before={diffEntry.before} after={diffEntry.after} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
