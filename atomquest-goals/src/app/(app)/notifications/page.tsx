import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Bell } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { NotificationsView } from "./notifications-view"

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      <NotificationsView notifications={notifications} />
    </div>
  )
}
