"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { getActiveCycle, isPhase1Open } from "@/lib/cycle"
import { goalSchema, returnSheetSchema, unlockSheetSchema } from "@/lib/validations"
import { z } from "zod"

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

async function requireAuth() {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthenticated")
  return session.user
}

export async function createSheet(): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireAuth()
    const cycle = await getActiveCycle()
    if (!cycle) return { ok: false, error: "No active goal cycle found" }
    if (!isPhase1Open(cycle)) return { ok: false, error: "Goal setting window is not open" }

    const existing = await db.goalSheet.findUnique({
      where: { employeeId_cycleId: { employeeId: user.id, cycleId: cycle.id } },
    })
    if (existing) return { ok: true, data: { id: existing.id } }

    const sheet = await db.goalSheet.create({
      data: { employeeId: user.id, cycleId: cycle.id },
    })

    await logAudit({
      actorId: user.id,
      entityType: "GoalSheet",
      entityId: sheet.id,
      action: "CREATE",
      after: { employeeId: user.id, cycleId: cycle.id },
    })

    revalidatePath("/goals")
    revalidatePath("/dashboard")
    return { ok: true, data: { id: sheet.id } }
  } catch (e) {
    return { ok: false, error: "Failed to create sheet" }
  }
}

export async function addGoal(sheetId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireAuth()
    const parsed = goalSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" }
    }

    const sheet = await db.goalSheet.findUnique({ where: { id: sheetId } })
    if (!sheet) return { ok: false, error: "Sheet not found" }
    if (sheet.employeeId !== user.id && user.role === "EMPLOYEE") {
      return { ok: false, error: "Unauthorized" }
    }
    if (sheet.status === "APPROVED") return { ok: false, error: "Cannot edit an approved sheet" }

    const count = await db.goal.count({ where: { sheetId } })
    if (count >= 8) return { ok: false, error: "Maximum 8 goals per sheet" }

    const data = parsed.data
    let targetNumeric = data.targetNumeric ?? null
    let targetDate = data.targetDate ? new Date(data.targetDate) : null

    if (data.uomType === "ZERO") targetNumeric = 0
    if (data.uomType === "TIMELINE") targetNumeric = null
    else targetDate = null

    const goal = await db.goal.create({
      data: {
        sheetId,
        thrustAreaId: data.thrustAreaId,
        title: data.title,
        description: data.description,
        uomType: data.uomType,
        targetNumeric,
        targetDate,
        weightage: data.weightage,
        sortOrder: data.sortOrder ?? count,
      },
    })

    await logAudit({
      actorId: user.id,
      entityType: "Goal",
      entityId: goal.id,
      action: "CREATE",
      after: goal,
    })

    revalidatePath(`/goals`)
    return { ok: true, data: { id: goal.id } }
  } catch (e) {
    return { ok: false, error: "Failed to add goal" }
  }
}

export async function updateGoal(goalId: string, input: unknown): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const parsed = goalSchema.partial().safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" }
    }

    const goal = await db.goal.findUnique({
      where: { id: goalId },
      include: { sheet: true },
    })
    if (!goal) return { ok: false, error: "Goal not found" }
    if (goal.sheet.employeeId !== user.id && user.role === "EMPLOYEE") {
      return { ok: false, error: "Unauthorized" }
    }
    if (goal.sheet.status === "APPROVED" && user.role !== "ADMIN") {
      return { ok: false, error: "Cannot edit an approved sheet" }
    }

    const data = parsed.data
    const before = { ...goal }

    const updated = await db.goal.update({
      where: { id: goalId },
      data: {
        ...(data.thrustAreaId && { thrustAreaId: data.thrustAreaId }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.uomType !== undefined && { uomType: data.uomType }),
        ...(data.targetNumeric !== undefined && { targetNumeric: data.uomType === "ZERO" ? 0 : data.targetNumeric }),
        ...(data.targetDate !== undefined && { targetDate: data.targetDate ? new Date(data.targetDate) : null }),
        ...(data.weightage !== undefined && { weightage: data.weightage }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    })

    await logAudit({
      actorId: user.id,
      entityType: "Goal",
      entityId: goalId,
      action: "UPDATE",
      before,
      after: updated,
    })

    revalidatePath("/goals")
    revalidatePath(`/approvals/${goal.sheetId}`)
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: "Failed to update goal" }
  }
}

export async function removeGoal(goalId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const goal = await db.goal.findUnique({
      where: { id: goalId },
      include: { sheet: true },
    })
    if (!goal) return { ok: false, error: "Goal not found" }
    if (goal.sheet.employeeId !== user.id && user.role === "EMPLOYEE") {
      return { ok: false, error: "Unauthorized" }
    }
    if (goal.sheet.status !== "DRAFT") return { ok: false, error: "Can only remove goals from DRAFT sheets" }

    await db.goal.delete({ where: { id: goalId } })
    await logAudit({
      actorId: user.id,
      entityType: "Goal",
      entityId: goalId,
      action: "DELETE",
      before: goal,
    })

    revalidatePath("/goals")
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: "Failed to remove goal" }
  }
}

export async function submitSheet(sheetId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const sheet = await db.goalSheet.findUnique({
      where: { id: sheetId },
      include: { goals: true, cycle: true },
    })
    if (!sheet) return { ok: false, error: "Sheet not found" }
    if (sheet.employeeId !== user.id) return { ok: false, error: "Unauthorized" }
    if (sheet.status !== "DRAFT") return { ok: false, error: "Only DRAFT sheets can be submitted" }
    if (!isPhase1Open(sheet.cycle)) return { ok: false, error: "Goal setting window is closed" }

    const goals = sheet.goals
    if (goals.length < 1) return { ok: false, error: "At least 1 goal required" }
    if (goals.length > 8) return { ok: false, error: "Maximum 8 goals allowed" }

    const total = goals.reduce((s, g) => s + g.weightage, 0)
    if (Math.abs(total - 100) >= 0.01) {
      return { ok: false, error: `Total weightage must be 100. Currently ${total.toFixed(1)}` }
    }

    const before = { status: sheet.status }
    const updated = await db.goalSheet.update({
      where: { id: sheetId },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    })

    await logAudit({
      actorId: user.id,
      entityType: "GoalSheet",
      entityId: sheetId,
      action: "SUBMIT",
      before,
      after: { status: "SUBMITTED" },
    })

    // Notify manager
    if (user.managerId) {
      await db.notification.create({
        data: {
          userId: user.managerId,
          type: "SHEET_SUBMITTED",
          title: "Goal sheet submitted for approval",
          body: `${user.name} has submitted their goals for review.`,
          link: `/approvals/${sheetId}`,
        },
      })
    }

    revalidatePath("/goals")
    revalidatePath("/dashboard")
    revalidatePath("/approvals")
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: "Failed to submit sheet" }
  }
}

export async function approveSheet(sheetId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    if (user.role !== "MANAGER" && user.role !== "ADMIN") {
      return { ok: false, error: "Only managers can approve sheets" }
    }

    const sheet = await db.goalSheet.findUnique({
      where: { id: sheetId },
      include: { employee: true },
    })
    if (!sheet) return { ok: false, error: "Sheet not found" }
    if (sheet.status !== "SUBMITTED") return { ok: false, error: "Only SUBMITTED sheets can be approved" }

    // Verify manager-employee relationship
    if (user.role === "MANAGER" && sheet.employee.managerId !== user.id) {
      return { ok: false, error: "Unauthorized — not the direct manager" }
    }

    const before = { status: sheet.status }
    await db.goalSheet.update({
      where: { id: sheetId },
      data: { status: "APPROVED", approvedAt: new Date(), approvedById: user.id },
    })

    await logAudit({
      actorId: user.id,
      entityType: "GoalSheet",
      entityId: sheetId,
      action: "APPROVE",
      before,
      after: { status: "APPROVED", approvedById: user.id },
    })

    await db.notification.create({
      data: {
        userId: sheet.employeeId,
        type: "SHEET_APPROVED",
        title: "Your goals have been approved",
        body: "Your goal sheet has been approved. You can now track your quarterly progress.",
        link: `/goals/${sheetId}`,
      },
    })

    revalidatePath("/approvals")
    revalidatePath(`/approvals/${sheetId}`)
    revalidatePath("/team")
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: "Failed to approve sheet" }
  }
}

export async function returnSheet(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    if (user.role !== "MANAGER" && user.role !== "ADMIN") {
      return { ok: false, error: "Unauthorized" }
    }

    const parsed = returnSheetSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" }
    }

    const { sheetId, reason } = parsed.data
    const sheet = await db.goalSheet.findUnique({
      where: { id: sheetId },
      include: { employee: true },
    })
    if (!sheet) return { ok: false, error: "Sheet not found" }
    if (sheet.status !== "SUBMITTED") return { ok: false, error: "Only SUBMITTED sheets can be returned" }

    if (user.role === "MANAGER" && sheet.employee.managerId !== user.id) {
      return { ok: false, error: "Unauthorized" }
    }

    const before = { status: sheet.status }
    await db.goalSheet.update({
      where: { id: sheetId },
      data: { status: "DRAFT", returnedReason: reason },
    })

    await logAudit({
      actorId: user.id,
      entityType: "GoalSheet",
      entityId: sheetId,
      action: "RETURN",
      before,
      after: { status: "DRAFT", returnedReason: reason },
      reason,
    })

    await db.notification.create({
      data: {
        userId: sheet.employeeId,
        type: "SHEET_RETURNED",
        title: "Your goals were returned for revision",
        body: reason,
        link: `/goals`,
      },
    })

    revalidatePath("/approvals")
    revalidatePath(`/approvals/${sheetId}`)
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: "Failed to return sheet" }
  }
}

export async function unlockSheet(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    if (user.role !== "ADMIN") return { ok: false, error: "Only admins can unlock sheets" }

    const parsed = unlockSheetSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Reason is required" }
    }

    const { sheetId, reason } = parsed.data
    const sheet = await db.goalSheet.findUnique({ where: { id: sheetId } })
    if (!sheet) return { ok: false, error: "Sheet not found" }
    if (sheet.status !== "APPROVED") return { ok: false, error: "Only APPROVED sheets can be unlocked" }

    const before = { status: sheet.status }
    await db.goalSheet.update({
      where: { id: sheetId },
      data: { status: "DRAFT", approvedAt: null, approvedById: null },
    })

    await logAudit({
      actorId: user.id,
      entityType: "GoalSheet",
      entityId: sheetId,
      action: "UNLOCK",
      before,
      after: { status: "DRAFT" },
      reason,
    })

    revalidatePath("/admin/sheets")
    revalidatePath(`/goals/${sheetId}`)
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: "Failed to unlock sheet" }
  }
}
