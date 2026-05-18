"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Unlock, Loader2, Download, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials, formatDate, cn } from "@/lib/utils"
import { unlockSheet } from "@/server/actions/sheets"
import type { GoalSheet, Goal, GoalCycle, User } from "@prisma/client"

type Sheet = GoalSheet & { employee: User; cycle: GoalCycle; goals: Goal[] }

const STATUS_VARIANTS = {
  DRAFT:     "muted",
  SUBMITTED: "warning",
  APPROVED:  "success",
  RETURNED:  "destructive",
} as const

export function AdminSheetsView({ sheets }: { sheets: Sheet[] }) {
  const router = useRouter()
  const [unlockTarget, setUnlockTarget] = useState<Sheet | null>(null)
  const [reason, setReason] = useState("")
  const [unlocking, setUnlocking] = useState(false)

  async function handleUnlock() {
    if (!unlockTarget || !reason.trim()) return
    setUnlocking(true)
    const r = await unlockSheet({ sheetId: unlockTarget.id, reason })
    setUnlocking(false)
    if (r.ok) {
      toast.success("Sheet unlocked — audit entry created")
      setUnlockTarget(null)
      setReason("")
      router.refresh()
    } else {
      toast.error(r.error)
    }
  }

  const approvedCount = sheets.filter((s) => s.status === "APPROVED").length

  return (
    <>
      {/* Info bar */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-warning/25 bg-warning/8 px-4 py-3 text-sm text-warning-foreground">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            All unlock actions are <strong>permanently recorded</strong> in the audit trail. A reason is required.
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.open("/api/export/achievements", "_blank")} className="shrink-0 gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Employee</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Goals</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sheets.map((sheet) => (
              <TableRow key={sheet.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 ring-2 ring-border">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(sheet.employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{sheet.employee.name}</p>
                      <p className="text-xs text-muted-foreground">{sheet.employee.department ?? sheet.employee.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{sheet.cycle.name}</TableCell>
                <TableCell><span className="font-mono text-sm font-semibold">{sheet.goals.length}</span></TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[sheet.status] ?? "muted"}>{sheet.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(sheet.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  {sheet.status === "APPROVED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUnlockTarget(sheet)}
                      className="h-7 gap-1.5 text-destructive hover:bg-destructive/8 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      Unlock
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!unlockTarget} onOpenChange={(o) => !o && setUnlockTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Unlock className="h-5 w-5" />
              Unlock Goal Sheet
            </DialogTitle>
            <DialogDescription>
              This will revert <strong>{unlockTarget?.employee.name}'s</strong> sheet to DRAFT.
              The employee will need to resubmit for approval. This action is permanently logged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Reason * (required for audit)
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Goal objectives changed due to org restructure…"
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleUnlock} disabled={unlocking || !reason.trim()}>
              {unlocking && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
