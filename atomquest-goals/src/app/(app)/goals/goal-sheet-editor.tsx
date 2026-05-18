"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useFieldArray, useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Trash2, Loader2, GripVertical, Send, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WeightageBar } from "@/components/goals/weightage-bar"
import { UomFieldset } from "@/components/goals/uom-fieldset"
import { getStatusColor, cn } from "@/lib/utils"
import { addGoal, updateGoal, removeGoal, submitSheet } from "@/server/actions/sheets"
import type { GoalSheet, Goal, ThrustArea, GoalCycle, Achievement, UomType } from "@prisma/client"

type SheetWithGoals = GoalSheet & {
  goals: (Goal & { thrustArea: ThrustArea; achievements: Achievement[] })[]
  cycle: GoalCycle
}

interface GoalSheetEditorProps {
  sheet: SheetWithGoals
  thrustAreas: ThrustArea[]
  cycle: GoalCycle
}

const goalFormSchema = z.object({
  thrustAreaId: z.string().min(1, "Required"),
  title: z.string().min(1, "Required").max(200),
  description: z.string().max(1000).optional(),
  uomType: z.string().min(1, "Required"),
  targetNumeric: z.number().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  weightage: z.number().min(10, "Min 10").max(100, "Max 100"),
})

type GoalFormData = z.infer<typeof goalFormSchema>

interface GoalCardProps {
  goal: Goal & { thrustArea: ThrustArea }
  thrustAreas: ThrustArea[]
  index: number
  cycleStart: Date
  cycleEnd: Date
  onSave: (id: string, data: GoalFormData) => Promise<void>
  onRemove: (id: string) => Promise<void>
  disabled: boolean
  autoExpand?: boolean
}

function GoalCard({ goal, thrustAreas, index, cycleStart, cycleEnd, onSave, onRemove, disabled, autoExpand }: GoalCardProps) {
  const [expanded, setExpanded] = useState(autoExpand ?? false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      thrustAreaId: goal.thrustAreaId,
      title: goal.title,
      description: goal.description ?? "",
      uomType: goal.uomType,
      targetNumeric: goal.targetNumeric,
      targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split("T")[0] : null,
      weightage: goal.weightage,
    },
  })

  const uomType = watch("uomType") as UomType | ""
  const targetNumeric = watch("targetNumeric")
  const targetDate = watch("targetDate")

  async function handleSave(data: GoalFormData) {
    setSaving(true)
    await onSave(goal.id, data)
    setSaving(false)
  }

  async function handleRemove() {
    setRemoving(true)
    await onRemove(goal.id)
    setRemoving(false)
  }

  return (
    <Card className={cn(
      "transition-all duration-150",
      expanded ? "border-primary/40 shadow-sm shadow-primary/5 ring-1 ring-primary/10" : "hover:border-border-strong"
    )}>
      <CardHeader className="py-0 px-0">
        <button
          type="button"
          onClick={() => !disabled && setExpanded(!expanded)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
          disabled={disabled}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
            {index + 1}
          </div>
          <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{goal.title || <span className="text-muted-foreground italic">Untitled goal</span>}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{goal.thrustArea.name} · <span className="font-mono font-semibold">{goal.weightage}%</span></p>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleRemove}
              disabled={removing || disabled}
              aria-label="Remove goal"
            >
              {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
            <div className={cn("transition-transform duration-150", expanded ? "rotate-180" : "")}>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="border-t mb-4" />
          <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor={`title-${goal.id}`}>Goal Title *</Label>
                <Input id={`title-${goal.id}`} {...register("title")} placeholder="e.g. Achieve customer satisfaction score of 90%+" />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor={`desc-${goal.id}`}>Description</Label>
                <Textarea id={`desc-${goal.id}`} {...register("description")} placeholder="Optional details, success criteria…" rows={2} />
              </div>

              <div className="space-y-1.5">
                <Label>Thrust Area *</Label>
                <Controller
                  name="thrustAreaId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select thrust area…" />
                      </SelectTrigger>
                      <SelectContent>
                        {thrustAreas.map((ta) => (
                          <SelectItem key={ta.id} value={ta.id}>{ta.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.thrustAreaId && <p className="text-xs text-destructive">{errors.thrustAreaId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`weightage-${goal.id}`}>Weightage * (10–100%)</Label>
                <div className="relative">
                  <Input
                    id={`weightage-${goal.id}`}
                    type="number"
                    step="0.1"
                    min="10"
                    max="100"
                    {...register("weightage", { valueAsNumber: true })}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                {errors.weightage && <p className="text-xs text-destructive">{errors.weightage.message}</p>}
              </div>
            </div>

            <UomFieldset
              uomType={uomType}
              onUomTypeChange={(v) => setValue("uomType", v, { shouldDirty: true })}
              targetNumeric={targetNumeric}
              onTargetNumericChange={(v) => setValue("targetNumeric", v, { shouldDirty: true })}
              targetDate={targetDate ?? null}
              onTargetDateChange={(v) => setValue("targetDate", v, { shouldDirty: true })}
              errors={{
                uomType: errors.uomType?.message,
                targetNumeric: errors.targetNumeric?.message,
                targetDate: errors.targetDate?.message,
              }}
              cycleStart={cycleStart.toISOString().split("T")[0]}
              cycleEnd={cycleEnd.toISOString().split("T")[0]}
              disabled={disabled}
            />

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={saving || !isDirty}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  )
}

export function GoalSheetEditor({ sheet, thrustAreas, cycle }: GoalSheetEditorProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [goals, setGoals] = useState(sheet.goals)
  const [addingGoal, setAddingGoal] = useState(false)
  const [newGoalId, setNewGoalId] = useState<string | null>(null)

  const weightages = goals.map((g) => g.weightage)
  const titles = goals.map((g) => g.title)
  const isLocked = sheet.status !== "DRAFT"

  async function handleAddGoal() {
    setAddingGoal(true)
    const result = await addGoal(sheet.id, {
      thrustAreaId: thrustAreas[0]?.id ?? "",
      title: "New goal",
      uomType: "NUMERIC_MIN",
      targetNumeric: 100,
      weightage: 10,
    })
    setAddingGoal(false)
    if (result.ok) {
      setNewGoalId(result.data.id)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleSaveGoal(goalId: string, data: GoalFormData) {
    const result = await updateGoal(goalId, data)
    if (result.ok) {
      toast.success("Goal saved")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleRemoveGoal(goalId: string) {
    const result = await removeGoal(goalId)
    if (result.ok) {
      toast.success("Goal removed")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    const result = await submitSheet(sheet.id)
    setSubmitting(false)
    if (result.ok) {
      toast.success("Goals submitted for approval")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const totalWeightage = weightages.reduce((s, w) => s + w, 0)
  const canSubmit = goals.length >= 1 && goals.length <= 8 && Math.abs(totalWeightage - 100) < 0.01

  return (
    <div className="space-y-5">
      {/* Status bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Badge className={cn("rounded-full px-2.5", getStatusColor(sheet.status))}>{sheet.status}</Badge>
          <span className="text-xs text-muted-foreground font-mono">{goals.length} / 8 goals</span>
          {sheet.status === "DRAFT" && sheet.returnedReason && (
            <span className="flex items-center gap-1 text-xs text-destructive rounded-full border border-destructive/20 bg-destructive/8 px-2.5 py-0.5">
              Returned: {sheet.returnedReason}
            </span>
          )}
        </div>
        {sheet.status === "DRAFT" && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddGoal}
              disabled={addingGoal || goals.length >= 8}
            >
              {addingGoal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add Goal
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              title={!canSubmit ? `Fix weightage (currently ${totalWeightage.toFixed(1)}%) before submitting` : undefined}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Submit for Approval
            </Button>
          </div>
        )}
      </div>

      {/* Weightage bar */}
      {goals.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <WeightageBar weightages={weightages} titles={titles} />
          </CardContent>
        </Card>
      )}

      {/* Goal cards */}
      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Plus className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No goals yet. Add your first goal above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {goals.map((goal, idx) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              thrustAreas={thrustAreas}
              index={idx}
              cycleStart={cycle.fyStart}
              cycleEnd={cycle.fyEnd}
              onSave={handleSaveGoal}
              onRemove={handleRemoveGoal}
              disabled={isLocked}
              autoExpand={goal.id === newGoalId}
            />
          ))}
        </div>
      )}

      {sheet.status === "SUBMITTED" && (
        <p className="text-sm text-muted-foreground text-center">
          Your goals are pending manager approval. You will be notified once reviewed.
        </p>
      )}
    </div>
  )
}
