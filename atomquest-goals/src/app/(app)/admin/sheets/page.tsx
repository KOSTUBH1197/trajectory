import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { AdminSheetsView } from "./admin-sheets-view"

export default async function AdminSheetsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard")

  const sheets = await db.goalSheet.findMany({
    include: {
      employee: true,
      cycle: true,
      goals: true,
    },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sheet Override</h1>
        <p className="mt-1 text-sm text-muted-foreground">Unlock approved sheets (admin only — all actions are audited)</p>
      </div>
      <AdminSheetsView sheets={sheets} />
    </div>
  )
}
