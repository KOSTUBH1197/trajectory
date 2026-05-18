"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, Loader2, Pencil, Trash2, UserPlus, Shield, Users, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials, cn } from "@/lib/utils"
import { userCreateSchema, type UserCreateInput } from "@/lib/validations"
import { createUser, updateUser, deleteUser } from "@/server/actions/admin"
import type { User as PUser, Role } from "@prisma/client"

type UserWithManager = PUser & { manager: { id: string; name: string } | null }

const ROLE_CONFIG: Record<Role, { label: string; icon: React.ComponentType<{className?: string}>; variant: "default" | "warning" | "muted" }> = {
  ADMIN:    { label: "Admin",    icon: Shield, variant: "default" },
  MANAGER:  { label: "Manager",  icon: Users,  variant: "warning" },
  EMPLOYEE: { label: "Employee", icon: User,   variant: "muted" },
}

function UserForm({ onSubmit, defaultValues, isEdit, managers }: {
  onSubmit: (data: UserCreateInput) => Promise<void>
  defaultValues?: Partial<UserCreateInput>
  isEdit?: boolean
  managers: PUser[]
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schema: any = isEdit ? userCreateSchema.partial().omit({ password: true }) : userCreateSchema
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<UserCreateInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { role: "EMPLOYEE" },
  })

  const fieldClass = "space-y-1.5"
  const labelClass = "text-xs font-medium text-muted-foreground uppercase tracking-wider"

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={fieldClass}>
          <Label className={labelClass}>Full Name *</Label>
          <Input {...register("name")} placeholder="Priya Sharma" className="h-9" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className={fieldClass}>
          <Label className={labelClass}>Email *</Label>
          <Input type="email" {...register("email")} placeholder="priya@atomquest.demo" className="h-9" />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        {!isEdit && (
          <div className={fieldClass}>
            <Label className={labelClass}>Password *</Label>
            <Input type="password" {...register("password")} placeholder="Min 6 characters" className="h-9" />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
        )}
        <div className={fieldClass}>
          <Label className={labelClass}>Role *</Label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className={fieldClass}>
          <Label className={labelClass}>Department</Label>
          <Input {...register("department")} placeholder="e.g. Sales, Engineering" className="h-9" />
        </div>
        <div className={fieldClass}>
          <Label className={labelClass}>Manager</Label>
          <Controller
            name="managerId"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="No manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Create User"}
        </Button>
      </div>
    </form>
  )
}

export function UsersManager({ users, managers }: { users: UserWithManager[]; managers: PUser[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserWithManager | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const byRole = (role: Role) => users.filter((u) => u.role === role).length

  async function handleCreate(data: UserCreateInput) {
    const r = await createUser(data)
    if (r.ok) { toast.success("User created"); setCreateOpen(false); router.refresh() }
    else toast.error(r.error)
  }
  async function handleEdit(data: UserCreateInput) {
    if (!editUser) return
    const r = await updateUser(editUser.id, data)
    if (r.ok) { toast.success("User updated"); setEditUser(null); router.refresh() }
    else toast.error(r.error)
  }
  async function handleDelete(id: string) {
    setDeleting(id)
    const r = await deleteUser(id)
    setDeleting(null)
    if (r.ok) { toast.success("User deleted"); router.refresh() }
    else toast.error(r.error)
  }

  return (
    <>
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {(["ADMIN", "MANAGER", "EMPLOYEE"] as Role[]).map((role) => {
          const cfg = ROLE_CONFIG[role]
          const Icon = cfg.icon
          return (
            <Card key={role} className="p-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono leading-none">{byRole(role)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}{byRole(role) !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const cfg = ROLE_CONFIG[u.role]
              return (
                <TableRow key={u.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 ring-2 ring-border">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm leading-tight">{u.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cfg.variant} className="gap-1.5">
                      <cfg.icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.department ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.manager?.name ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditUser(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/8"
                        onClick={() => handleDelete(u.id)}
                        disabled={deleting === u.id}
                      >
                        {deleting === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new user account and assign their role and manager.</DialogDescription>
          </DialogHeader>
          <UserForm onSubmit={handleCreate} managers={managers} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update {editUser?.name}'s profile and access settings.</DialogDescription>
          </DialogHeader>
          {editUser && (
            <UserForm
              onSubmit={handleEdit}
              defaultValues={{
                name: editUser.name, email: editUser.email, role: editUser.role,
                department: editUser.department ?? undefined, managerId: editUser.managerId,
              }}
              isEdit managers={managers}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
