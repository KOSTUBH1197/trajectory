"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkinCommentSchema } from "@/lib/validations"
import type { Quarter } from "@prisma/client"

export async function addCheckinComment(input: unknown) {
  try {
    const session = await auth()
    if (!session?.user) return { ok: false, error: "Unauthenticated" }
    const user = session.user
    if (user.role !== "MANAGER" && user.role !== "ADMIN") {
      return { ok: false, error: "Only managers can add check-in comments" }
    }

    const parsed = checkinCommentSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" }

    const { sheetId, quarter, comment } = parsed.data
    const sheet = await db.goalSheet.findUnique({ where: { id: sheetId }, include: { employee: true } })
    if (!sheet) return { ok: false, error: "Sheet not found" }

    if (user.role === "MANAGER" && sheet.employee.managerId !== user.id) {
      return { ok: false, error: "Unauthorized" }
    }

    const c = await db.checkinComment.create({
      data: { sheetId, quarter: quarter as Quarter, managerId: user.id, comment },
    })

    revalidatePath("/team-checkins")
    revalidatePath(`/checkins`)
    return { ok: true, data: { id: c.id } }
  } catch (e) {
    return { ok: false, error: "Failed to add comment" }
  }
}

export async function getCheckinComments(sheetId: string, quarter: Quarter) {
  const session = await auth()
  if (!session?.user) return []
  return db.checkinComment.findMany({
    where: { sheetId, quarter },
    orderBy: { createdAt: "asc" },
    include: { sheet: { include: { employee: true } } },
  })
}
