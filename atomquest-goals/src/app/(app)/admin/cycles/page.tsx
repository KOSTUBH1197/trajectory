import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { CyclesManager } from "./cycles-manager"

export default async function AdminCyclesPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard")

  const cycles = await db.goalCycle.findMany({ orderBy: { fyStart: "desc" } })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Goal Cycles</h1>
      <CyclesManager cycles={cycles} />
    </div>
  )
}
