import { redirect, notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ApprovalReview } from "./approval-review"

export default async function ApprovalDetailPage({ params }: { params: Promise<{ sheetId: string }> }) {
  const { sheetId } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role === "EMPLOYEE") redirect("/dashboard")

  const sheet = await db.goalSheet.findUnique({
    where: { id: sheetId },
    include: {
      employee: true,
      cycle: true,
      goals: {
        include: { thrustArea: true, achievements: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  })
  if (!sheet) notFound()

  const thrustAreas = await db.thrustArea.findMany({ orderBy: { name: "asc" } })

  return <ApprovalReview sheet={sheet} currentUser={session.user} thrustAreas={thrustAreas} />
}
