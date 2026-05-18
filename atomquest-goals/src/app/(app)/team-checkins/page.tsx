import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getActiveCycle } from "@/lib/cycle"
import { TeamCheckinsView } from "./team-checkins-view"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCcw } from "lucide-react"

export default async function TeamCheckinsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role === "EMPLOYEE") redirect("/dashboard")
  const user = session.user

  const cycle = await getActiveCycle()
  if (!cycle) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Team Check-ins</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCcw className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-sm text-muted-foreground">No active cycle</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const reports = await db.user.findMany({
    where: user.role === "MANAGER" ? { managerId: user.id } : {},
    include: {
      sheets: {
        where: { cycleId: cycle.id },
        include: {
          goals: {
            include: { thrustArea: true, achievements: true },
            orderBy: { sortOrder: "asc" },
          },
          comments: { orderBy: { createdAt: "asc" } },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Check-ins</h1>
        <p className="mt-1 text-sm text-muted-foreground">{cycle.name}</p>
      </div>
      <TeamCheckinsView reports={reports} cycle={cycle} currentUserId={user.id} />
    </div>
  )
}
