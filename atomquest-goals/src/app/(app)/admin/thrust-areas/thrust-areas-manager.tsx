"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { thrustAreaSchema, type ThrustAreaInput } from "@/lib/validations"
import { createThrustArea, updateThrustArea, deleteThrustArea } from "@/server/actions/admin"
import type { ThrustArea } from "@prisma/client"

function ThrustAreaForm({ onSubmit, defaultValues }: {
  onSubmit: (data: ThrustAreaInput) => Promise<void>
  defaultValues?: ThrustAreaInput
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ThrustAreaInput>({
    resolver: zodResolver(thrustAreaSchema),
    defaultValues,
  })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ta-name">Name *</Label>
        <Input id="ta-name" {...register("name")} placeholder="e.g. Customer Excellence" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ta-desc">Description</Label>
        <Textarea id="ta-desc" {...register("description")} placeholder="Optional description…" rows={2} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  )
}

export function ThrustAreasManager({ thrustAreas }: { thrustAreas: ThrustArea[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTA, setEditTA] = useState<ThrustArea | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleCreate(data: ThrustAreaInput) {
    const r = await createThrustArea(data)
    if (r.ok) { toast.success("Thrust area created"); setCreateOpen(false); router.refresh() }
    else toast.error(r.error)
  }

  async function handleEdit(data: ThrustAreaInput) {
    if (!editTA) return
    const r = await updateThrustArea(editTA.id, data)
    if (r.ok) { toast.success("Thrust area updated"); setEditTA(null); router.refresh() }
    else toast.error(r.error)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const r = await deleteThrustArea(id)
    setDeleting(null)
    if (r.ok) { toast.success("Deleted"); router.refresh() }
    else toast.error(r.error)
  }

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Thrust Area
        </Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {thrustAreas.map((ta) => (
              <TableRow key={ta.id}>
                <TableCell className="font-medium">{ta.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{ta.description ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTA(ta)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(ta.id)}
                      disabled={deleting === ta.id}
                    >
                      {deleting === ta.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Thrust Area</DialogTitle></DialogHeader>
          <ThrustAreaForm onSubmit={handleCreate} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editTA} onOpenChange={(o) => !o && setEditTA(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Thrust Area</DialogTitle></DialogHeader>
          {editTA && <ThrustAreaForm onSubmit={handleEdit} defaultValues={{ name: editTA.name, description: editTA.description ?? undefined }} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
