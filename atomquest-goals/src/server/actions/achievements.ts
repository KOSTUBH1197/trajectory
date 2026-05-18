"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { calculateScore } from "@/lib/scoring"
import { getActiveCycle, isQuarterOpen } from "@/lib/cycle"
import { achievementSchema } from "@/lib/validations"
import type { Quarter } from "@prisma/client"

export async function upsertAchievement(input: unknown) {
  try {
    const session = await auth()
    if (!session?.user) return { ok: false, error: "Unauthenticated" }
    const user = session.user

    const parsed = achievementSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" }
    }

    const { goalId, quarter, actualNumeric, actualDate, status } = parsed.data

    const goal = await db.goal.findUnique({
      where: { id: goalId },
      include: { sheet: { include: { cycle: true } } },
    })
    if (!goal) return { ok: false, error: "Goal not found" }

    // Auth: owner or manager
    if (
      goal.sheet.employeeId !== user.id &&
      user.role !== "ADMIN" &&
      user.role !== "MANAGER"
    ) {
      return { ok: false, error: "Unauthorized" }
    }

    // Sheet must be approved
    if (goal.sheet.status !== "APPROVED") {
      return { ok: false, error: "Goal sheet must be approved before entering actuals" }
    }

    // Quarter window must be open (employees) or bypass for admin
    if (user.role === "EMPLOYEE") {
      const cycle = goal.sheet.cycle
      if (!isQuarterOpen(cycle, quarter as Quarter)) {
        return { ok: false, error: `${quarter} check-in window is not open` }
      }
    }

    // ZERO goals: actualNumeric must be 0 unless incident
    let finalActual = actualNumeric ?? null
    if (goal.uomType === "ZERO" && finalActual == null) finalActual = 0

    const score = calculateScore({
      uomType: goal.uomType,
      targetNumeric: goal.targetNumeric,
      targetDate: goal.targetDate,
      actualNumeric: finalActual,
      actualDate: actualDate ? new Date(actualDate) : null,
    })

    const existing = await db.achievement.findUnique({
      where: { goalId_quarter: { goalId, quarter: quarter as Quarter } },
    })

    const data = {
      actualNumeric: finalActual,
      actualDate: actualDate ? new Date(actualDate) : null,
      status: status as "NOT_STARTED" | "ON_TRACK" | "COMPLETED",
      score,
      updatedById: user.id,
    }

    let achievement
    if (existing) {
      achievement = await db.achievement.update({
        where: { goalId_quarter: { goalId, quarter: quarter as Quarter } },
        data,
      })
      await logAudit({
        actorId: user.id,
        entityType: "Achievement",
        entityId: existing.id,
        action: "UPDATE",
        before: existing,
        after: achievement,
      })
    } else {
      achievement = await db.achievement.create({
        data: { goalId, quarter: quarter as Quarter, ...data },
      })
      await logAudit({
        actorId: user.id,
        entityType: "Achievement",
        entityId: achievement.id,
        action: "CREATE",
        after: achievement,
      })
    }

    revalidatePath("/checkins")
    revalidatePath("/team-checkins")
    return { ok: true, data: { score } }
  } catch (e) {
    return { ok: false, error: "Failed to save achievement" }
  }
}
