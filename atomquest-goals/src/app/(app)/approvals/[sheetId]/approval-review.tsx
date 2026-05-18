"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Edit2, Check, Target, Weight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { WeightageBar } from "@/components/goals/weightage-bar"
import { approveSheet, returnSheet, updateGoal } from "@/server/actions/sheets"
import { getStatusColor, getUomLabel, formatDate, getInitials, cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { GoalSheet, Goal, ThrustArea, Achievement, GoalCycle, User, Role } from "@prisma/client"

type Sheet = GoalSheet & {
  employee: User
  cycle: GoalCycle
  goals: (Goal & { thrustArea: ThrustArea; achievements: Achievement[] })[]
}

interface ApprovalReviewProps {
  sheet: Sheet
  currentUser: { id: string; role: Role; name: string }
  thrustAreas: ThrustArea[]
}

export function ApprovalReview({ sheet, currentUser, thrustAreas }: ApprovalReviewProps) {
  const router = useRouter()
  const [approving, setApproving] = useState(false)
  const [returning, setReturning] = useState(false)
  const [returnReason, setReturnReason] = useState("")
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWeightage, setEditWeightage] = useState<number>(0)
  const [savingEdit, setSavingEdit] = useState(false)

  async function handleApprove() {
    setApproving(true)
    const result = await approveSheet(sheet.id)
    setApproving(false)
    if (result.ok) {
      toast.success("Sheet approved successfully")
      router.push("/approvals")
    } else {
      toast.error(result.error)
    }
  }

  async function handleReturn() {
    if (!returnReason.trim()) return
    setReturning(true)
    const result = await returnSheet({ sheetId: sheet.id, reason: returnReason })
    setReturning(false)
    if (result.ok) {
      toast.success("Sheet returned for revision")
      setReturnDialogOpen(false)
      router.push("/approvals")
    } else {
      toast.error(result.error)
    }
  }

  async function saveWeightage(goalId: string, weightage: number) {
    setSavingEdit(true)
    const result = await updateGoal(goalId, { weightage })
    setSavingEdit(false)
    if (result.ok) {
      toast.success("Weightage updated")
      setEditingId(null)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const goals = sheet.goals
  const totalWeightage = goals.reduce((s, g) => s + g.weightage, 0)
  const isWeightageValid = Math.abs(totalWeightage - 100) < 0.01

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-10 w-10 ring-2 ring-border">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(sheet.employee.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">{sheet.employee.name}</h1>
            <p className="text-sm text-muted-foreground">
              {sheet.employee.department ?? sheet.employee.email} · {sheet.cycle.name}
            </p>
          </div>
        </div>

        {sheet.status === "SUBMITTED" && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setReturnDialogOpen(true)}
              disabled={approving}
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
            >
              <XCircle className="h-4 w-4" />
              Return
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving || !isWeightageValid}
              className="gap-2"
              title={!isWeightageValid ? "Weightage must total 100% before approving" : undefined}
            >
              {approving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CheckCircle2 className="h-4 w-4" />
              }
              Approve
            </Button>
          </div>
        )}
      </div>

      {/* Status chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={sheet.status === "SUBMITTED" ? "warning" : sheet.status === "APPROVED" ? "success" : "muted"}>
          {sheet.status}
        </Badge>
        {sheet.submittedAt && (
          <span className="text-xs text-muted-foreground">
            Submitted {formatDate(sheet.submittedAt)}
          </span>
        )}
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">{goals.length} goals</span>
      </div>

      {/* Weightage overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Weight className="h-4 w-4 text-muted-foreground" />
            Weightage Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WeightageBar
            weightages={goals.map((g) => g.weightage)}
            titles={goals.map((g) => g.title)}
          />
        </CardContent>
      </Card>

      {/* Goals table */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Goals
            {sheet.status === "SUBMITTED" && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                Click any weightage to edit inline
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8">#</TableHead>
              <TableHead>Goal</TableHead>
              <TableHead>Thrust Area</TableHead>
              <TableHead>Measurement</TableHead>
              <TableHead>Target</TableHead>
              <TableHead className="text-right">Weightage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {goals.map((goal, idx) => (
              <TableRow key={goal.id}>
                <TableCell>
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="font-medium text-sm leading-tight">{goal.title}</p>
                  {goal.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{goal.description}</p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs whitespace-nowrap">{goal.thrustArea.name}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">{getUomLabel(goal.uomType)}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs font-semibold">
                    {goal.uomType === "TIMELINE"
                      ? formatDate(goal.targetDate)
                      : goal.uomType === "ZERO"
                      ? "0"
                      : `${goal.targetNumeric}${goal.uomType.includes("PERCENT") ? "%" : ""}`}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {editingId === goal.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="10"
                        max="100"
                        value={editWeightage}
                        onChange={(e) => setEditWeightage(Number(e.target.value))}
                        className="h-7 w-20 text-right font-mono text-xs"
                        autoFocus
                        onBlur={() => saveWeightage(goal.id, editWeightage)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveWeightage(goal.id, editWeightage)
                          if (e.key === "Escape") setEditingId(null)
                        }}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                      {savingEdit && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    </div>
                  ) : (
                    <button
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-sm font-semibold transition-colors",
                        sheet.status === "SUBMITTED"
                          ? "hover:bg-primary/8 hover:text-primary cursor-text group"
                          : "cursor-default"
                      )}
                      onClick={() => {
                        if (sheet.status === "SUBMITTED") {
                          setEditingId(goal.id)
                          setEditWeightage(goal.weightage)
                        }
                      }}
                    >
                      {goal.weightage}%
                      {sheet.status === "SUBMITTED" && (
                        <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                      )}
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="hover:bg-transparent bg-muted/20">
              <TableCell colSpan={5} className="text-right text-xs font-semibold text-muted-foreground">
                Total
              </TableCell>
              <TableCell className="text-right">
                <span className={cn(
                  "font-mono text-sm font-bold",
                  isWeightageValid ? "text-success" : "text-destructive"
                )}>
                  {totalWeightage.toFixed(totalWeightage % 1 === 0 ? 0 : 1)}%
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      {/* Return dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return for revision</DialogTitle>
            <DialogDescription>
              {sheet.employee.name} will receive a notification with your feedback and can resubmit after making changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs text-muted-foreground uppercase tracking-wider">
              Reason *
            </Label>
            <Textarea
              id="reason"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. Please add a learning goal and ensure all weightages reflect priority…"
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReturn}
              disabled={returning || !returnReason.trim()}
            >
              {returning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Return Sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
