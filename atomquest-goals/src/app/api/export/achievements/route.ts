import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { calculateScore } from "@/lib/scoring"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const sheets = await db.goalSheet.findMany({
    include: {
      employee: true,
      cycle: true,
      goals: {
        include: { thrustArea: true, achievements: true },
      },
    },
    orderBy: { employee: { name: "asc" } },
  })

  const rows: string[] = [
    "Employee,Email,Department,Cycle,Thrust Area,Goal Title,UoM Type,Target,Weightage,Quarter,Actual,Score,Status"
  ]

  for (const sheet of sheets) {
    for (const goal of sheet.goals) {
      const quarters = ["Q1", "Q2", "Q3", "Q4"] as const
      for (const quarter of quarters) {
        const ach = goal.achievements.find((a) => a.quarter === quarter)
        if (!ach) {
          rows.push([
            `"${sheet.employee.name}"`,
            sheet.employee.email,
            sheet.employee.department ?? "",
            `"${sheet.cycle.name}"`,
            `"${goal.thrustArea.name}"`,
            `"${goal.title.replace(/"/g, '""')}"`,
            goal.uomType,
            goal.uomType === "TIMELINE"
              ? (goal.targetDate?.toISOString().split("T")[0] ?? "")
              : String(goal.targetNumeric ?? ""),
            String(goal.weightage),
            quarter,
            "",
            "",
            ""
          ].join(","))
          continue
        }

        const score =
          ach.score ??
          calculateScore({
            uomType: goal.uomType,
            targetNumeric: goal.targetNumeric,
            targetDate: goal.targetDate,
            actualNumeric: ach.actualNumeric,
            actualDate: ach.actualDate,
          })

        const actual = goal.uomType === "TIMELINE"
          ? (ach.actualDate?.toISOString().split("T")[0] ?? "")
          : String(ach.actualNumeric ?? "")

        rows.push([
          `"${sheet.employee.name}"`,
          sheet.employee.email,
          sheet.employee.department ?? "",
          `"${sheet.cycle.name}"`,
          `"${goal.thrustArea.name}"`,
          `"${goal.title.replace(/"/g, '""')}"`,
          goal.uomType,
          goal.uomType === "TIMELINE"
            ? (goal.targetDate?.toISOString().split("T")[0] ?? "")
            : String(goal.targetNumeric ?? ""),
          String(goal.weightage),
          quarter,
          actual,
          (score * 100).toFixed(1) + "%",
          ach.status
        ].join(","))
      }
    }
  }

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="achievements-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  })
}
