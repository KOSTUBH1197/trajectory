import { Clock, AlertCircle } from "lucide-react"
import { getActiveCycle, getCurrentWindow } from "@/lib/cycle"
import { cn } from "@/lib/utils"

export async function CycleBanner() {
  const cycle = await getActiveCycle()
  if (!cycle) return null

  const window = getCurrentWindow(cycle)
  if (!window) return null

  const isUrgent = window.daysRemaining <= 7

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b px-6 py-2 text-xs",
        isUrgent
          ? "bg-warning/10 text-warning-foreground border-warning/20"
          : "bg-primary/5 text-foreground border-border"
      )}
    >
      {isUrgent ? (
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warning-foreground" />
      ) : (
        <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
      )}
      <span>
        <strong>{cycle.name}</strong>
        {" · "}
        {window.type === "phase1"
          ? "Goal Setting Window"
          : `${window.quarter} Check-in Window`}
        {" is open · closes in "}
        <strong>{window.daysRemaining} day{window.daysRemaining !== 1 ? "s" : ""}</strong>
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isUrgent ? "bg-warning" : "bg-primary"
            )}
            style={{
              width: `${Math.max(0, 100 - (window.daysRemaining / 30) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
