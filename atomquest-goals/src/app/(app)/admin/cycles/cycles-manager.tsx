"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, Loader2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getStatusColor, formatDate } from "@/lib/utils"
import { cycleSchema, type CycleInput } from "@/lib/validations"
import { createCycle, updateCycle } from "@/server/actions/admin"
import type { GoalCycle, CycleStatus } from "@prisma/client"

const DATE_FIELDS = [
  { key: "fyStart", label: "FY Start" },
  { key: "fyEnd", label: "FY End" },
  { key: "phase1Open", label: "Phase 1 Open" },
  { key: "phase1Close", label: "Phase 1 Close" },
  { key: "q1Open", label: "Q1 Open" },
  { key: "q1Close", label: "Q1 Close" },
  { key: "q2Open", label: "Q2 Open" },
  { key: "q2Close", label: "Q2 Close" },
  { key: "q3Open", label: "Q3 Open" },
  { key: "q3Close", label: "Q3 Close" },
  { key: "q4Open", label: "Q4 Open" },
  { key: "q4Close", label: "Q4 Close" },
] as const

function toDateInput(d?: Date | string) {
  if (!d) return ""
  return new Date(d).toISOString().split("T")[0]
}

function CycleForm({
  onSubmit,
  defaultValues,
  isEdit,
}: {
  onSubmit: (data: CycleInput) => Promise<void>
  defaultValues?: Partial<CycleInput>
  isEdit?: boolean
}) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<CycleInput>({
    resolver: zodResolver(cycleSchema),
    defaultValues: defaultValues ?? { status: "DRAFT" },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Cycle Name *</Label>
          <Input id="name" {...register("name")} placeholder="e.g. FY 2025-26" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        {DATE_FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key}>{label} *</Label>
            <Input id={key} type="date" {...register(key)} />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            defaultValue={defaultValues?.status ?? "DRAFT"}
            onValueChange={(v) => setValue("status", v as CycleStatus)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">DRAFT</SelectItem>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="CLOSED">CLOSED</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Create Cycle"}
        </Button>
      </div>
    </form>
  )
}

export function CyclesManager({ cycles }: { cycles: GoalCycle[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editCycle, setEditCycle] = useState<GoalCycle | null>(null)

  async function handleCreate(data: CycleInput) {
    const result = await createCycle(data)
    if (result.ok) {
      toast.success("Cycle created")
      setCreateOpen(false)
      router.refresh()
    } else toast.error(result.error)
  }

  async function handleEdit(data: CycleInput) {
    if (!editCycle) return
    const result = await updateCycle(editCycle.id, data)
    if (result.ok) {
      toast.success("Cycle updated")
      setEditCycle(null)
      router.refresh()
    } else toast.error(result.error)
  }

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Cycle
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>FY Period</TableHead>
              <TableHead>Phase 1</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cycles.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(c.fyStart)} — {formatDate(c.fyEnd)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(c.phase1Open)} — {formatDate(c.phase1Close)}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditCycle(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Goal Cycle</DialogTitle></DialogHeader>
          <CycleForm onSubmit={handleCreate} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCycle} onOpenChange={(o) => !o && setEditCycle(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Cycle</DialogTitle></DialogHeader>
          {editCycle && (
            <CycleForm
              onSubmit={handleEdit}
              defaultValues={{
                name: editCycle.name,
                status: editCycle.status,
                ...Object.fromEntries(
                  DATE_FIELDS.map(({ key }) => [key, toDateInput((editCycle as GoalCycle)[key as keyof GoalCycle] as Date)])
                ),
              }}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
