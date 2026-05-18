import type { UomType } from "@prisma/client"

const SCORE_CAP = 1.5 // 150% max

interface ScoringInput {
  uomType: UomType
  targetNumeric: number | null
  targetDate: Date | null
  actualNumeric: number | null | undefined
  actualDate: Date | null | undefined
}

export function calculateScore(input: ScoringInput): number {
  const { uomType, targetNumeric, targetDate, actualNumeric, actualDate } = input

  switch (uomType) {
    case "ZERO":
      return (actualNumeric ?? 0) === 0 ? 1.0 : 0.0

    case "TIMELINE": {
      if (!actualDate || !targetDate) return 0.0
      return new Date(actualDate) <= new Date(targetDate) ? 1.0 : 0.0
    }

    case "NUMERIC_MIN":
    case "PERCENT_MIN": {
      // Higher achievement is better (e.g. revenue, satisfaction)
      if (actualNumeric == null || !targetNumeric) return 0.0
      if (targetNumeric === 0) return actualNumeric > 0 ? 1.0 : 0.0
      return Math.min(actualNumeric / targetNumeric, SCORE_CAP)
    }

    case "NUMERIC_MAX":
    case "PERCENT_MAX": {
      // Lower achievement is better (e.g. TAT, cost, defect rate)
      if (actualNumeric == null || !targetNumeric) return 0.0
      if (actualNumeric === 0) return targetNumeric > 0 ? SCORE_CAP : 1.0
      return Math.min(targetNumeric / actualNumeric, SCORE_CAP)
    }

    default:
      return 0.0
  }
}

export interface GoalWithAchievement {
  weightage: number
  uomType: UomType
  targetNumeric: number | null
  targetDate: Date | null
  achievements: Array<{
    quarter: string
    actualNumeric: number | null
    actualDate: Date | null
    score: number | null
  }>
}

export function calculateWeightedScore(
  goals: GoalWithAchievement[],
  quarter: string
): number | null {
  let totalWeight = 0
  let weightedSum = 0
  let hasAny = false

  for (const goal of goals) {
    const ach = goal.achievements.find((a) => a.quarter === quarter)
    if (!ach) continue

    const score =
      ach.score ??
      calculateScore({
        uomType: goal.uomType,
        targetNumeric: goal.targetNumeric,
        targetDate: goal.targetDate,
        actualNumeric: ach.actualNumeric,
        actualDate: ach.actualDate,
      })

    weightedSum += score * goal.weightage
    totalWeight += goal.weightage
    hasAny = true
  }

  if (!hasAny || totalWeight === 0) return null
  return weightedSum / totalWeight
}
