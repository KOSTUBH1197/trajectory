"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { UomType } from "@prisma/client"

interface UomFieldsetProps {
  uomType: UomType | ""
  onUomTypeChange: (value: UomType) => void
  targetNumeric: number | null | undefined
  onTargetNumericChange: (value: number | null) => void
  targetDate: string | null | undefined
  onTargetDateChange: (value: string | null) => void
  errors?: {
    uomType?: string
    targetNumeric?: string
    targetDate?: string
  }
  cycleStart?: string
  cycleEnd?: string
  disabled?: boolean
}

const UOM_OPTIONS: { value: UomType; label: string; hint: string }[] = [
  { value: "NUMERIC_MIN", label: "Numeric — Higher is better", hint: "e.g. Revenue, customer satisfaction score" },
  { value: "NUMERIC_MAX", label: "Numeric — Lower is better", hint: "e.g. TAT hours, defect count, cost" },
  { value: "PERCENT_MIN", label: "Percentage — Higher is better", hint: "e.g. Attendance rate, satisfaction %" },
  { value: "PERCENT_MAX", label: "Percentage — Lower is better", hint: "e.g. Error rate, churn %" },
  { value: "TIMELINE", label: "Timeline — Date target", hint: "e.g. Project delivery, certification date" },
  { value: "ZERO", label: "Zero Tolerance", hint: "e.g. Safety incidents, data breaches" },
]

export function UomFieldset({
  uomType,
  onUomTypeChange,
  targetNumeric,
  onTargetNumericChange,
  targetDate,
  onTargetDateChange,
  errors,
  cycleStart,
  cycleEnd,
  disabled,
}: UomFieldsetProps) {
  const selectedOption = UOM_OPTIONS.find((o) => o.value === uomType)
  const isPercent = uomType === "PERCENT_MIN" || uomType === "PERCENT_MAX"
  const isTimeline = uomType === "TIMELINE"
  const isZero = uomType === "ZERO"

  return (
    <div className="space-y-4">
      {/* UoM type selector */}
      <div className="space-y-1.5">
        <Label>Measurement Type</Label>
        <Select
          value={uomType}
          onValueChange={(v) => onUomTypeChange(v as UomType)}
          disabled={disabled}
        >
          <SelectTrigger aria-describedby={errors?.uomType ? "uom-error" : undefined}>
            <SelectValue placeholder="Select measurement type…" />
          </SelectTrigger>
          <SelectContent>
            {UOM_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedOption && (
          <p className="text-xs text-muted-foreground">{selectedOption.hint}</p>
        )}
        {errors?.uomType && (
          <p id="uom-error" className="text-xs text-destructive">{errors.uomType}</p>
        )}
      </div>

      {/* Target input — changes based on UoM type */}
      {uomType && (
        <div className="space-y-1.5">
          {isZero ? (
            <div>
              <Label>Target</Label>
              <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                <span className="font-mono">0</span>
                <span className="ml-2 text-xs">(auto-enforced — target is always 0)</span>
              </div>
            </div>
          ) : isTimeline ? (
            <div className="space-y-1.5">
              <Label htmlFor="targetDate">Target Date</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate ?? ""}
                onChange={(e) => onTargetDateChange(e.target.value || null)}
                min={cycleStart}
                max={cycleEnd}
                disabled={disabled}
                aria-describedby={errors?.targetDate ? "tdate-error" : undefined}
              />
              {errors?.targetDate && (
                <p id="tdate-error" className="text-xs text-destructive">{errors.targetDate}</p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="targetNumeric">
                Target Value {isPercent && <span className="text-muted-foreground">(0–100%)</span>}
              </Label>
              <div className="relative">
                <Input
                  id="targetNumeric"
                  type="number"
                  step="0.01"
                  min={isPercent ? 0 : undefined}
                  max={isPercent ? 100 : undefined}
                  value={targetNumeric ?? ""}
                  onChange={(e) =>
                    onTargetNumericChange(e.target.value === "" ? null : Number(e.target.value))
                  }
                  disabled={disabled}
                  className={cn(isPercent && "pr-8")}
                  aria-describedby={errors?.targetNumeric ? "tnum-error" : undefined}
                />
                {isPercent && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                )}
              </div>
              {errors?.targetNumeric && (
                <p id="tnum-error" className="text-xs text-destructive">{errors.targetNumeric}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
