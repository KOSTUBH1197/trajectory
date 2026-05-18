import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const goalSchema = z.object({
  thrustAreaId: z.string().min(1, "Thrust area is required"),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
  uomType: z.enum(["NUMERIC_MIN", "NUMERIC_MAX", "PERCENT_MIN", "PERCENT_MAX", "TIMELINE", "ZERO"]),
  targetNumeric: z.number().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  weightage: z
    .number()
    .min(10, "Minimum weightage is 10")
    .max(100, "Maximum weightage is 100"),
  sortOrder: z.number().int().optional(),
})

export const goalSheetSubmitSchema = z
  .object({
    goals: z
      .array(goalSchema)
      .min(1, "At least 1 goal required")
      .max(8, "Maximum 8 goals allowed"),
  })
  .superRefine((data, ctx) => {
    const total = data.goals.reduce((sum, g) => sum + g.weightage, 0)
    if (Math.abs(total - 100) >= 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total weightage must equal 100. Currently ${total.toFixed(1)}`,
        path: ["goals"],
      })
    }

    data.goals.forEach((goal, i) => {
      if (goal.uomType === "TIMELINE") {
        if (!goal.targetDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Target date is required for Timeline goals",
            path: ["goals", i, "targetDate"],
          })
        }
      } else if (goal.uomType !== "ZERO") {
        if (goal.targetNumeric == null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Target value is required",
            path: ["goals", i, "targetNumeric"],
          })
        }
        if (
          (goal.uomType === "PERCENT_MIN" || goal.uomType === "PERCENT_MAX") &&
          goal.targetNumeric != null &&
          (goal.targetNumeric < 0 || goal.targetNumeric > 100)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Percentage must be between 0 and 100",
            path: ["goals", i, "targetNumeric"],
          })
        }
      }
    })
  })

export const achievementSchema = z.object({
  goalId: z.string().min(1),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  actualNumeric: z.number().nullable().optional(),
  actualDate: z.string().nullable().optional(),
  status: z.enum(["NOT_STARTED", "ON_TRACK", "COMPLETED"]),
})

export const cycleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  fyStart: z.string().min(1, "FY start date required"),
  fyEnd: z.string().min(1, "FY end date required"),
  phase1Open: z.string().min(1, "Required"),
  phase1Close: z.string().min(1, "Required"),
  q1Open: z.string().min(1, "Required"),
  q1Close: z.string().min(1, "Required"),
  q2Open: z.string().min(1, "Required"),
  q2Close: z.string().min(1, "Required"),
  q3Open: z.string().min(1, "Required"),
  q3Close: z.string().min(1, "Required"),
  q4Open: z.string().min(1, "Required"),
  q4Close: z.string().min(1, "Required"),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional(),
})

export const userCreateSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Minimum 6 characters"),
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]),
  department: z.string().optional(),
  managerId: z.string().nullable().optional(),
})

export const thrustAreaSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Too long"),
  description: z.string().max(500, "Too long").optional(),
})

export const returnSheetSchema = z.object({
  sheetId: z.string().min(1),
  reason: z.string().min(1, "Please provide a reason for returning"),
})

export const unlockSheetSchema = z.object({
  sheetId: z.string().min(1),
  reason: z.string().min(1, "Reason is required for audit trail"),
})

export const checkinCommentSchema = z.object({
  sheetId: z.string().min(1),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  comment: z.string().min(1, "Comment is required").max(1000, "Too long"),
})

export type LoginInput = z.infer<typeof loginSchema>
export type GoalInput = z.infer<typeof goalSchema>
export type AchievementInput = z.infer<typeof achievementSchema>
export type CycleInput = z.infer<typeof cycleSchema>
export type UserCreateInput = z.infer<typeof userCreateSchema>
export type ThrustAreaInput = z.infer<typeof thrustAreaSchema>
