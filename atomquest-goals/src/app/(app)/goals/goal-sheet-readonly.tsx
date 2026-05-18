import type { GoalSheet, Goal, ThrustArea, Achievement, GoalCycle } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { WeightageBar } from "@/components/goals/weightage-bar"
import { getStatusColor, getUomLabel, formatDate, formatScore } from "@/lib/utils"
import { CheckCircle2, Calendar } from "lucide-react"

type SheetWithGoals = GoalSheet & {
  goals: (Goal & { thrustArea: ThrustArea; achievements: Achievement[] })[]
  cycle: GoalCycle
}

export function GoalSheetReadOnly({ sheet }: { sheet: SheetWithGoals }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Badge className={getStatusColor(sheet.status)}>{sheet.status}</Badge>
        {sheet.approvedAt && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            Approved {formatDate(sheet.approvedAt)}
          </span>
        )}
      </div>

      <Card>
        <CardContent className="pt-4">
          <WeightageBar
            weightages={sheet.goals.map((g) => g.weightage)}
            titles={sheet.goals.map((g) => g.title)}
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {sheet.goals.map((goal, idx) => (
          <Card key={goal.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{idx + 1}</span>
                    <CardTitle className="text-base">{goal.title}</CardTitle>
                  </div>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{goal.thrustArea.name}</Badge>
                    <Badge variant="outline" className="text-xs">{getUomLabel(goal.uomType)}</Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {goal.uomType === "TIMELINE"
                        ? `Target: ${formatDate(goal.targetDate)}`
                        : goal.uomType === "ZERO"
                        ? "Target: 0"
                        : `Target: ${goal.targetNumeric}${goal.uomType.includes("PERCENT") ? "%" : ""}`}
                    </span>
                    <span className="text-xs font-semibold font-mono">{goal.weightage}%</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            {goal.achievements.length > 0 && (
              <CardContent>
                <div className="grid grid-cols-4 gap-3">
                  {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => {
                    const ach = goal.achievements.find((a) => a.quarter === q)
                    return (
                      <div key={q} className="text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{q}</p>
                        <p className="text-sm font-mono font-semibold">
                          {ach?.score != null ? formatScore(ach.score) : "—"}
                        </p>
                        {ach && (
                          <Badge className={`text-xs mt-1 ${getStatusColor(ach.status)}`}>
                            {ach.status.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
