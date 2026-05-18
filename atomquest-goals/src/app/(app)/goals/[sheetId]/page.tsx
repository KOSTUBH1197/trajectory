import { redirect, notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { GoalSheetReadOnly } from "../goal-sheet-readonly"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function GoalSheetDetailPage({ params }: { params: Promise<{ sheetId: string }> }) {
  const { sheetId } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")

  const sheet = await db.goalSheet.findUnique({
    where: { id: sheetId },
    include: {
      goals: {
        include: { thrustArea: true, achievements: true },
        orderBy: { sortOrder: "asc" },
      },
      cycle: true,
      employee: true,
    },
  })

  if (!sheet) notFound()

  // Authorization: only the owner or managers/admins can view
  const user = session.user
  if (
    sheet.employeeId !== user.id &&
    user.role !== "ADMIN" &&
    user.role !== "MANAGER"
  ) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/goals" aria-label="Back to goals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Goal Sheet — {sheet.cycle.name}</h1>
          {user.role !== "EMPLOYEE" && (
            <p className="text-sm text-muted-foreground">{sheet.employee.name}</p>
          )}
        </div>
      </div>
      <GoalSheetReadOnly sheet={sheet} />
    </div>
  )
}
