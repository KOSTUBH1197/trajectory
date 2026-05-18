import { db } from "./db"
import type { GoalCycle, Quarter } from "@prisma/client"

export interface ActiveWindow {
  cycleId: string
  cycleName: string
  type: "phase1" | "quarter"
  quarter?: Quarter
  open: Date
  close: Date
  daysRemaining: number
}

export async function getActiveCycle() {
  return db.goalCycle.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { fyStart: "desc" },
  })
}

export function getCurrentWindow(cycle: GoalCycle): ActiveWindow | null {
  const now = new Date()

  if (now >= cycle.phase1Open && now <= cycle.phase1Close) {
    return {
      cycleId: cycle.id,
      cycleName: cycle.name,
      type: "phase1",
      open: cycle.phase1Open,
      close: cycle.phase1Close,
      daysRemaining: Math.ceil(
        (cycle.phase1Close.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }
  }

  const quarters: Array<{ q: Quarter; open: Date; close: Date }> = [
    { q: "Q1", open: cycle.q1Open, close: cycle.q1Close },
    { q: "Q2", open: cycle.q2Open, close: cycle.q2Close },
    { q: "Q3", open: cycle.q3Open, close: cycle.q3Close },
    { q: "Q4", open: cycle.q4Open, close: cycle.q4Close },
  ]

  for (const { q, open, close } of quarters) {
    if (now >= open && now <= close) {
      return {
        cycleId: cycle.id,
        cycleName: cycle.name,
        type: "quarter",
        quarter: q,
        open,
        close,
        daysRemaining: Math.ceil(
          (close.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }
    }
  }

  return null
}

export function isPhase1Open(cycle: GoalCycle): boolean {
  const now = new Date()
  return now >= cycle.phase1Open && now <= cycle.phase1Close
}

export function isQuarterOpen(cycle: GoalCycle, quarter: Quarter): boolean {
  const now = new Date()
  const map: Record<Quarter, { open: Date; close: Date }> = {
    Q1: { open: cycle.q1Open, close: cycle.q1Close },
    Q2: { open: cycle.q2Open, close: cycle.q2Close },
    Q3: { open: cycle.q3Open, close: cycle.q3Close },
    Q4: { open: cycle.q4Open, close: cycle.q4Close },
  }
  const { open, close } = map[quarter]
  return now >= open && now <= close
}

export function getOpenQuarters(cycle: GoalCycle): Quarter[] {
  const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4"]
  return quarters.filter((q) => isQuarterOpen(cycle, q))
}
