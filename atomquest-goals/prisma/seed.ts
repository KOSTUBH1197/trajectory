import { PrismaClient, UomType, SheetStatus, AchievementStatus, Quarter } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

function daysFromNow(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysAgo(n: number) {
  return daysFromNow(-n)
}

async function main() {
  console.log("🌱 Seeding database…")
  await db.$transaction(async (tx) => {
    // Clean up
    await tx.auditLog.deleteMany()
    await tx.notification.deleteMany()
    await tx.checkinComment.deleteMany()
    await tx.achievement.deleteMany()
    await tx.goal.deleteMany()
    await tx.goalSheet.deleteMany()
    await tx.goalCycle.deleteMany()
    await tx.thrustArea.deleteMany()
    await tx.user.deleteMany()
  })

  const password = await bcrypt.hash("Demo@123", 12)

  // ── Thrust Areas ──────────────────────────────────────────────
  const [ta1, ta2, ta3, ta4, ta5] = await Promise.all([
    db.thrustArea.create({ data: { name: "Customer Excellence", description: "Deliver exceptional customer experiences and satisfaction" } }),
    db.thrustArea.create({ data: { name: "Operational Efficiency", description: "Streamline processes and reduce waste" } }),
    db.thrustArea.create({ data: { name: "Innovation & Growth", description: "Drive new products, markets, and revenue streams" } }),
    db.thrustArea.create({ data: { name: "People & Culture", description: "Build great teams and an inclusive workplace" } }),
    db.thrustArea.create({ data: { name: "Compliance & Risk", description: "Ensure regulatory compliance and risk management" } }),
  ])

  // ── Goal Cycle ────────────────────────────────────────────────
  const cycle = await db.goalCycle.create({
    data: {
      name: "FY 2025-26",
      status: "ACTIVE",
      fyStart: new Date("2025-04-01"),
      fyEnd: new Date("2026-03-31"),
      phase1Open: daysAgo(30),
      phase1Close: daysFromNow(60),
      q1Open: daysAgo(7),
      q1Close: daysFromNow(30),
      q2Open: new Date("2025-07-01"),
      q2Close: new Date("2025-07-31"),
      q3Open: new Date("2025-10-01"),
      q3Close: new Date("2025-10-31"),
      q4Open: new Date("2026-01-01"),
      q4Close: new Date("2026-01-31"),
    },
  })

  // ── Users ─────────────────────────────────────────────────────
  const admin = await db.user.create({
    data: { email: "raj.admin@atomquest.demo", name: "Raj Patel", passwordHash: password, role: "ADMIN", department: "Leadership" },
  })

  const mgr1 = await db.user.create({
    data: { email: "arjun.manager@atomquest.demo", name: "Arjun Kapoor", passwordHash: password, role: "MANAGER", department: "Sales", managerId: admin.id },
  })
  const mgr2 = await db.user.create({
    data: { email: "meera.manager@atomquest.demo", name: "Meera Iyer", passwordHash: password, role: "MANAGER", department: "Engineering", managerId: admin.id },
  })

  // Arjun's reports
  const priya = await db.user.create({ data: { email: "priya.employee@atomquest.demo", name: "Priya Sharma", passwordHash: password, role: "EMPLOYEE", department: "Sales", managerId: mgr1.id } })
  const vikram = await db.user.create({ data: { email: "vikram.employee@atomquest.demo", name: "Vikram Nair", passwordHash: password, role: "EMPLOYEE", department: "Sales", managerId: mgr1.id } })
  const ananya = await db.user.create({ data: { email: "ananya.employee@atomquest.demo", name: "Ananya Singh", passwordHash: password, role: "EMPLOYEE", department: "Sales", managerId: mgr1.id } })

  // Meera's reports
  const rohit = await db.user.create({ data: { email: "rohit.employee@atomquest.demo", name: "Rohit Desai", passwordHash: password, role: "EMPLOYEE", department: "Engineering", managerId: mgr2.id } })
  const sneha = await db.user.create({ data: { email: "sneha.employee@atomquest.demo", name: "Sneha Kumar", passwordHash: password, role: "EMPLOYEE", department: "Engineering", managerId: mgr2.id } })
  const karthik = await db.user.create({ data: { email: "karthik.employee@atomquest.demo", name: "Karthik Rajan", passwordHash: password, role: "EMPLOYEE", department: "Engineering", managerId: mgr2.id } })

  // ── Helper to create a full approved sheet with Q1 actuals ────
  async function createApprovedSheet(
    userId: string,
    managerId: string,
    goalDefs: Array<{
      thrustAreaId: string
      title: string
      uomType: UomType
      targetNumeric?: number
      targetDate?: Date
      weightage: number
      q1Actual?: number
      q1Date?: Date
      q1Status: AchievementStatus
    }>
  ) {
    const sheet = await db.goalSheet.create({
      data: {
        employeeId: userId,
        cycleId: cycle.id,
        status: "APPROVED" as SheetStatus,
        submittedAt: daysAgo(20),
        approvedAt: daysAgo(15),
        approvedById: managerId,
      },
    })

    let sortOrder = 0
    for (const g of goalDefs) {
      const goal = await db.goal.create({
        data: {
          sheetId: sheet.id,
          thrustAreaId: g.thrustAreaId,
          title: g.title,
          uomType: g.uomType,
          targetNumeric: g.targetNumeric ?? null,
          targetDate: g.targetDate ?? null,
          weightage: g.weightage,
          sortOrder: sortOrder++,
        },
      })

      await db.achievement.create({
        data: {
          goalId: goal.id,
          quarter: "Q1",
          actualNumeric: g.uomType === "TIMELINE" ? null : (g.q1Actual ?? null),
          actualDate: g.uomType === "TIMELINE" ? (g.q1Date ?? null) : null,
          status: g.q1Status,
          updatedById: userId,
          score: g.uomType === "ZERO"
            ? ((g.q1Actual ?? 0) === 0 ? 1.0 : 0.0)
            : g.uomType === "TIMELINE"
            ? (g.q1Date && g.targetDate && g.q1Date <= g.targetDate ? 1.0 : 0.0)
            : g.uomType === "NUMERIC_MAX" || g.uomType === "PERCENT_MAX"
            ? (g.targetNumeric && g.q1Actual ? Math.min(g.targetNumeric / g.q1Actual, 1.5) : null)
            : (g.targetNumeric && g.q1Actual ? Math.min(g.q1Actual / g.targetNumeric, 1.5) : null),
        },
      })
    }

    await db.auditLog.create({ data: { actorId: userId, entityType: "GoalSheet", entityId: sheet.id, action: "SUBMIT", after: { status: "SUBMITTED" } } })
    await db.auditLog.create({ data: { actorId: managerId, entityType: "GoalSheet", entityId: sheet.id, action: "APPROVE", before: { status: "SUBMITTED" }, after: { status: "APPROVED" } } })

    return sheet
  }

  // ── Vikram — APPROVED, Q1 actuals ─────────────────────────────
  await createApprovedSheet(vikram.id, mgr1.id, [
    { thrustAreaId: ta1.id, title: "Achieve customer satisfaction score of 90%+", uomType: "PERCENT_MIN", targetNumeric: 90, weightage: 25, q1Actual: 92, q1Status: "COMPLETED" },
    { thrustAreaId: ta2.id, title: "Reduce average TAT to under 24 hours", uomType: "NUMERIC_MAX", targetNumeric: 24, weightage: 25, q1Actual: 18, q1Status: "COMPLETED" },
    { thrustAreaId: ta3.id, title: "Close 15 new enterprise accounts", uomType: "NUMERIC_MIN", targetNumeric: 15, weightage: 30, q1Actual: 12, q1Status: "ON_TRACK" },
    { thrustAreaId: ta5.id, title: "Zero data privacy incidents", uomType: "ZERO", targetNumeric: 0, weightage: 20, q1Actual: 0, q1Status: "COMPLETED" },
  ])

  // ── Ananya — APPROVED, Q1 actuals ─────────────────────────────
  await createApprovedSheet(ananya.id, mgr1.id, [
    { thrustAreaId: ta1.id, title: "Maintain NPS above 70", uomType: "NUMERIC_MIN", targetNumeric: 70, weightage: 30, q1Actual: 74, q1Status: "COMPLETED" },
    { thrustAreaId: ta2.id, title: "Process 200 customer onboardings", uomType: "NUMERIC_MIN", targetNumeric: 200, weightage: 25, q1Actual: 185, q1Status: "ON_TRACK" },
    { thrustAreaId: ta4.id, title: "Complete leadership certification", uomType: "TIMELINE", targetDate: new Date("2025-09-30"), weightage: 20, q1Date: undefined, q1Status: "NOT_STARTED" },
    { thrustAreaId: ta5.id, title: "Maintain compliance rate above 98%", uomType: "PERCENT_MIN", targetNumeric: 98, weightage: 25, q1Actual: 99.5, q1Status: "COMPLETED" },
  ])

  // ── Rohit — APPROVED, Q1 actuals ──────────────────────────────
  await createApprovedSheet(rohit.id, mgr2.id, [
    { thrustAreaId: ta3.id, title: "Ship 4 major product features", uomType: "NUMERIC_MIN", targetNumeric: 4, weightage: 30, q1Actual: 1, q1Status: "ON_TRACK" },
    { thrustAreaId: ta2.id, title: "Reduce production incidents by 50%", uomType: "PERCENT_MAX", targetNumeric: 50, weightage: 25, q1Actual: 30, q1Status: "ON_TRACK" },
    { thrustAreaId: ta3.id, title: "Deploy new CI/CD pipeline by Q2", uomType: "TIMELINE", targetDate: new Date("2025-09-30"), weightage: 25, q1Date: undefined, q1Status: "ON_TRACK" },
    { thrustAreaId: ta5.id, title: "Zero critical security vulnerabilities", uomType: "ZERO", targetNumeric: 0, weightage: 20, q1Actual: 0, q1Status: "COMPLETED" },
  ])

  // ── Sneha — APPROVED, Q1 actuals ──────────────────────────────
  await createApprovedSheet(sneha.id, mgr2.id, [
    { thrustAreaId: ta4.id, title: "Mentor 3 junior engineers", uomType: "NUMERIC_MIN", targetNumeric: 3, weightage: 25, q1Actual: 2, q1Status: "ON_TRACK" },
    { thrustAreaId: ta3.id, title: "Achieve 95% unit test coverage", uomType: "PERCENT_MIN", targetNumeric: 95, weightage: 30, q1Actual: 91, q1Status: "ON_TRACK" },
    { thrustAreaId: ta2.id, title: "Reduce page load time to under 2s", uomType: "NUMERIC_MAX", targetNumeric: 2, weightage: 25, q1Actual: 2.4, q1Status: "ON_TRACK" },
    { thrustAreaId: ta5.id, title: "Complete GDPR audit checklist", uomType: "TIMELINE", targetDate: new Date("2025-06-30"), weightage: 20, q1Date: undefined, q1Status: "NOT_STARTED" },
  ])

  // ── Karthik — SUBMITTED (pending approval) ────────────────────
  const karthikSheet = await db.goalSheet.create({
    data: {
      employeeId: karthik.id,
      cycleId: cycle.id,
      status: "SUBMITTED",
      submittedAt: daysAgo(2),
    },
  })
  const karthikGoals = [
    { thrustAreaId: ta3.id, title: "Implement AI-powered recommendation engine", uomType: "TIMELINE" as UomType, targetDate: new Date("2025-12-31"), weightage: 35 },
    { thrustAreaId: ta2.id, title: "Achieve 99.9% service uptime", uomType: "PERCENT_MIN" as UomType, targetNumeric: 99.9, weightage: 30 },
    { thrustAreaId: ta4.id, title: "Conduct 4 knowledge sharing sessions", uomType: "NUMERIC_MIN" as UomType, targetNumeric: 4, weightage: 20 },
    { thrustAreaId: ta5.id, title: "Zero security incidents", uomType: "ZERO" as UomType, targetNumeric: 0, weightage: 15 },
  ]
  for (let i = 0; i < karthikGoals.length; i++) {
    await db.goal.create({ data: { sheetId: karthikSheet.id, sortOrder: i, ...karthikGoals[i] } })
  }
  await db.auditLog.create({ data: { actorId: karthik.id, entityType: "GoalSheet", entityId: karthikSheet.id, action: "SUBMIT", after: { status: "SUBMITTED" } } })

  // ── Priya — DRAFT (for demo flow) ─────────────────────────────
  // No sheet yet — demo creates it live

  // ── Shared goal from Arjun to his 3 reports ──────────────────
  // Push to Vikram's sheet (already created, just add a note)
  const vikramSheet = await db.goalSheet.findFirst({ where: { employeeId: vikram.id, cycleId: cycle.id } })
  if (vikramSheet) {
    await db.goal.create({
      data: {
        sheetId: vikramSheet.id,
        thrustAreaId: ta1.id,
        title: "Team: Achieve customer satisfaction score of 90%+",
        uomType: "PERCENT_MIN",
        targetNumeric: 90,
        weightage: 0, // manager-set shared goal, 0 weight to not break totals
        isShared: true,
        sortOrder: 99,
      },
    })
  }

  // ── Check-in comments ─────────────────────────────────────────
  const vikramSheetFull = await db.goalSheet.findFirst({ where: { employeeId: vikram.id, cycleId: cycle.id } })
  if (vikramSheetFull) {
    await db.checkinComment.create({
      data: { sheetId: vikramSheetFull.id, quarter: "Q1", managerId: mgr1.id, comment: "Strong Q1 performance. TAT improvement is excellent — watch the new account growth in Q2 as pipeline thins." },
    })
  }

  // ── Backfill audit entries ─────────────────────────────────────
  const entries = [
    { actorId: admin.id, entityType: "User", entityId: mgr1.id, action: "CREATE", after: { name: "Arjun Kapoor", role: "MANAGER" } },
    { actorId: admin.id, entityType: "User", entityId: mgr2.id, action: "CREATE", after: { name: "Meera Iyer", role: "MANAGER" } },
    { actorId: admin.id, entityType: "GoalCycle", entityId: cycle.id, action: "CREATE", after: { name: "FY 2025-26", status: "ACTIVE" } },
    { actorId: admin.id, entityType: "ThrustArea", entityId: ta1.id, action: "CREATE", after: { name: "Customer Excellence" } },
    { actorId: admin.id, entityType: "ThrustArea", entityId: ta2.id, action: "CREATE", after: { name: "Operational Efficiency" } },
  ]

  for (const e of entries) {
    await db.auditLog.create({
      data: {
        ...e,
        before: undefined,
        createdAt: daysAgo(Math.floor(Math.random() * 30) + 1),
      },
    })
  }

  // ── Notifications ─────────────────────────────────────────────
  await db.notification.create({
    data: {
      userId: mgr1.id,
      type: "SHEET_SUBMITTED",
      title: "Karthik Rajan submitted goals for approval",
      body: "Please review and approve or return with feedback.",
      link: `/approvals/${karthikSheet.id}`,
    },
  })
  await db.notification.create({
    data: {
      userId: vikram.id,
      type: "SHEET_APPROVED",
      title: "Your goals have been approved",
      body: "Arjun Kapoor approved your FY 2025-26 goal sheet. Start tracking your quarterly progress.",
      link: `/goals`,
    },
  })

  const userCount = await db.user.count()
  const taCount = await db.thrustArea.count()
  const sheetCount = await db.goalSheet.count()
  const goalCount = await db.goal.count()
  const achCount = await db.achievement.count()
  const auditCount = await db.auditLog.count()

  console.log(`
✅ Seed complete!

  Users:         ${userCount}
  Thrust Areas:  ${taCount}
  Cycles:        1
  Goal Sheets:   ${sheetCount}
  Goals:         ${goalCount}
  Achievements:  ${achCount}
  Audit entries: ${auditCount}

  Login credentials (password: Demo@123):
  ┌─────────────────────────────────────────────────────────┐
  │  Admin:    raj.admin@atomquest.demo                     │
  │  Manager:  arjun.manager@atomquest.demo                 │
  │  Manager:  meera.manager@atomquest.demo                 │
  │  Employee: priya.employee@atomquest.demo  (DEMO USER)   │
  │  Employee: vikram.employee@atomquest.demo               │
  └─────────────────────────────────────────────────────────┘
  `)
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
