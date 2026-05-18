"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function markNotificationRead(id: string) {
  const session = await auth()
  if (!session?.user) return { ok: false, error: "Unauthenticated" }
  await db.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { read: true },
  })
  revalidatePath("/notifications")
  return { ok: true, data: undefined }
}

export async function markAllRead() {
  const session = await auth()
  if (!session?.user) return { ok: false, error: "Unauthenticated" }
  await db.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  })
  revalidatePath("/notifications")
  return { ok: true, data: undefined }
}

export async function getUnreadCount() {
  const session = await auth()
  if (!session?.user) return 0
  return db.notification.count({ where: { userId: session.user.id, read: false } })
}
