import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getActiveCycle } from "@/lib/cycle"
import { AnalyticsDashboard } from "./analytics-dashboard"
import { Card, CardContent } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role === "EMPLOYEE") redirect("/dashboard")
  const user = session.user

  const cycle = await getActiveCycle()
  if (!cycle) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-sm text-muted-foreground">No active cycle to analyze</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch all approved sheets with achievements
  const sheets = await db.goalSheet.findMany({
    where: {
      cycleId: cycle.id,
      status: "APPROVED",
      ...(user.role === "MANAGER" ? { employee: { managerId: user.id } } : {}),
    },
    include: {
      employee: { include: { manager: { select: { id: true, name: true } } } },
      goals: {
        include: {
          thrustArea: true,
          achievements: true,
        },
      },
    },
  })

  const thrustAreas = await db.thrustArea.findMany({ orderBy: { name: "asc" } })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">{cycle.name} · {sheets.length} approved sheets</p>
      </div>
      <AnalyticsDashboard sheets={sheets} thrustAreas={thrustAreas} cycle={cycle} />
    </div>
  )
}
