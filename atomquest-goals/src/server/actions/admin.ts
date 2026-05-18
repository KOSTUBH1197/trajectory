"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { userCreateSchema, cycleSchema, thrustAreaSchema } from "@/lib/validations"
import bcrypt from "bcryptjs"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Forbidden")
  return session.user
}

// Users
export async function createUser(input: unknown) {
  try {
    const actor = await requireAdmin()
    const parsed = userCreateSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" }

    const { email, name, password, role, department, managerId } = parsed.data
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return { ok: false, error: "Email already in use" }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await db.user.create({
      data: { email, name, passwordHash, role, department, managerId: managerId ?? null },
    })

    await logAudit({ actorId: actor.id, entityType: "User", entityId: user.id, action: "CREATE", after: { email, name, role } })
    revalidatePath("/admin/users")
    return { ok: true, data: { id: user.id } }
  } catch (e) {
    return { ok: false, error: "Failed to create user" }
  }
}

export async function updateUser(userId: string, input: unknown) {
  try {
    const actor = await requireAdmin()
    const parsed = userCreateSchema.partial().omit({ password: true }).safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" }

    const before = await db.user.findUnique({ where: { id: userId } })
    const updated = await db.user.update({ where: { id: userId }, data: { ...parsed.data, managerId: parsed.data.managerId ?? null } })
    await logAudit({ actorId: actor.id, entityType: "User", entityId: userId, action: "UPDATE", before, after: updated })
    revalidatePath("/admin/users")
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: "Failed to update user" }
  }
}

export async function deleteUser(userId: string) {
  try {
    const actor = await requireAdmin()
    const user = await db.user.findUnique({ where: { id: userId } })
    await db.user.delete({ where: { id: userId } })
    await logAudit({ actorId: actor.id, entityType: "User", entityId: userId, action: "DELETE", before: user })
    revalidatePath("/admin/users")
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: "Failed to delete user" }
  }
}

// Cycles
export async function createCycle(input: unknown) {
  try {
    const actor = await requireAdmin()
    const parsed = cycleSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" }

    const d = parsed.data
    const cycle = await db.goalCycle.create({
      data: {
        name: d.name,
        fyStart: new Date(d.fyStart),
        fyEnd: new Date(d.fyEnd),
        phase1Open: new Date(d.phase1Open),
        phase1Close: new Date(d.phase1Close),
        q1Open: new Date(d.q1Open),
        q1Close: new Date(d.q1Close),
        q2Open: new Date(d.q2Open),
        q2Close: new Date(d.q2Close),
        q3Open: new Date(d.q3Open),
        q3Close: new Date(d.q3Close),
        q4Open: new Date(d.q4Open),
        q4Close: new Date(d.q4Close),
        status: d.status ?? "DRAFT",
      },
    })
    await logAudit({ actorId: actor.id, entityType: "GoalCycle", entityId: cycle.id, action: "CREATE", after: cycle })
    revalidatePath("/admin/cycles")
    return { ok: true, data: { id: cycle.id } }
  } catch (e) {
    return { ok: false, error: "Failed to create cycle" }
  }
}

export async function updateCycle(cycleId: string, input: unknown) {
  try {
    const actor = await requireAdmin()
    const parsed = cycleSchema.partial().safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" }

    const d = parsed.data
    const before = await db.goalCycle.findUnique({ where: { id: cycleId } })
    const updated = await db.goalCycle.update({
      where: { id: cycleId },
      data: {
        ...(d.name && { name: d.name }),
        ...(d.status && { status: d.status }),
        ...(d.fyStart && { fyStart: new Date(d.fyStart) }),
        ...(d.fyEnd && { fyEnd: new Date(d.fyEnd) }),
        ...(d.phase1Open && { phase1Open: new Date(d.phase1Open) }),
        ...(d.phase1Close && { phase1Close: new Date(d.phase1Close) }),
        ...(d.q1Open && { q1Open: new Date(d.q1Open) }),
        ...(d.q1Close && { q1Close: new Date(d.q1Close) }),
        ...(d.q2Open && { q2Open: new Date(d.q2Open) }),
        ...(d.q2Close && { q2Close: new Date(d.q2Close) }),
        ...(d.q3Open && { q3Open: new Date(d.q3Open) }),
        ...(d.q3Close && { q3Close: new Date(d.q3Close) }),
        ...(d.q4Open && { q4Open: new Date(d.q4Open) }),
        ...(d.q4Close && { q4Close: new Date(d.q4Close) }),
      },
    })
    await logAudit({ actorId: actor.id, entityType: "GoalCycle", entityId: cycleId, action: "UPDATE", before, after: updated })
    revalidatePath("/admin/cycles")
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: "Failed to update cycle" }
  }
}

// Thrust Areas
export async function createThrustArea(input: unknown) {
  try {
    const actor = await requireAdmin()
    const parsed = thrustAreaSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" }

    const ta = await db.thrustArea.create({ data: parsed.data })
    await logAudit({ actorId: actor.id, entityType: "ThrustArea", entityId: ta.id, action: "CREATE", after: ta })
    revalidatePath("/admin/thrust-areas")
    return { ok: true, data: { id: ta.id } }
  } catch (e) {
    return { ok: false, error: "Failed to create thrust area" }
  }
}

export async function updateThrustArea(id: string, input: unknown) {
  try {
    const actor = await requireAdmin()
    const parsed = thrustAreaSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" }

    const before = await db.thrustArea.findUnique({ where: { id } })
    const updated = await db.thrustArea.update({ where: { id }, data: parsed.data })
    await logAudit({ actorId: actor.id, entityType: "ThrustArea", entityId: id, action: "UPDATE", before, after: updated })
    revalidatePath("/admin/thrust-areas")
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: "Failed to update thrust area" }
  }
}

export async function deleteThrustArea(id: string) {
  try {
    const actor = await requireAdmin()
    const ta = await db.thrustArea.findUnique({ where: { id } })
    await db.thrustArea.delete({ where: { id } })
    await logAudit({ actorId: actor.id, entityType: "ThrustArea", entityId: id, action: "DELETE", before: ta })
    revalidatePath("/admin/thrust-areas")
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: "Failed to delete thrust area" }
  }
}
