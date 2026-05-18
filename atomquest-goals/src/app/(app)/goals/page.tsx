import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getActiveCycle } from "@/lib/cycle"
import { GoalSheetEditor } from "./goal-sheet-editor"
import { GoalSheetReadOnly } from "./goal-sheet-readonly"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Target, Plus } from "lucide-react"
import { createSheet } from "@/server/actions/sheets"
import { CreateSheetButton } from "./create-sheet-button"

export default async function GoalsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user

  const cycle = await getActiveCycle()
  if (!cycle) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">My Goals</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="font-semibold">No active goal cycle</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your administrator has not set up a goal cycle yet.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sheet = await db.goalSheet.findUnique({
    where: { employeeId_cycleId: { employeeId: user.id, cycleId: cycle.id } },
    include: {
      goals: {
        include: { thrustArea: true, achievements: true },
        orderBy: { sortOrder: "asc" },
      },
      cycle: true,
    },
  })

  const thrustAreas = await db.thrustArea.findMany({ orderBy: { name: "asc" } })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Goals</h1>
          <p className="mt-1 text-sm text-muted-foreground">{cycle.name}</p>
        </div>
      </div>

      {!sheet ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="font-semibold">No goal sheet yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Create your goal sheet for {cycle.name} to get started.
            </p>
            <CreateSheetButton />
          </CardContent>
        </Card>
      ) : sheet.status === "APPROVED" ? (
        <GoalSheetReadOnly sheet={sheet} />
      ) : (
        <GoalSheetEditor sheet={sheet} thrustAreas={thrustAreas} cycle={cycle} />
      )}
    </div>
  )
}
