import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getActiveCycle, getOpenQuarters } from "@/lib/cycle"
import { CheckinsEditor } from "./checkins-editor"
import { Card, CardContent } from "@/components/ui/card"
import { CheckSquare } from "lucide-react"

export default async function CheckinsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user

  const cycle = await getActiveCycle()
  if (!cycle) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Check-ins</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-sm text-muted-foreground">No active cycle</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const openQuarters = getOpenQuarters(cycle)

  const sheet = await db.goalSheet.findUnique({
    where: { employeeId_cycleId: { employeeId: user.id, cycleId: cycle.id } },
    include: {
      goals: {
        include: {
          thrustArea: true,
          achievements: { orderBy: { quarter: "asc" } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Check-ins</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cycle.name} · {openQuarters.length > 0 ? `${openQuarters.join(", ")} window open` : "No quarter windows currently open"}
        </p>
      </div>

      {!sheet || sheet.status !== "APPROVED" ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="font-semibold">Goal sheet not yet approved</p>
            <p className="text-sm text-muted-foreground mt-1">
              You can enter actuals once your manager approves your goals.
            </p>
          </CardContent>
        </Card>
      ) : (
        <CheckinsEditor sheet={sheet} cycle={cycle} openQuarters={openQuarters} />
      )}
    </div>
  )
}
