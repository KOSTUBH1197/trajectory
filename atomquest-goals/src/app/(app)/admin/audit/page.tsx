import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { AuditLogView } from "./audit-log-view"

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard")

  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? 1))
  const pageSize = 50
  const entityTypeFilter = sp.entityType

  const where = entityTypeFilter ? { entityType: entityTypeFilter } : {}

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditLog.count({ where }),
  ])

  // Resolve actor names
  const actorIds = [...new Set(logs.map((l) => l.actorId))]
  const actors = await db.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true, email: true },
  })
  const actorMap = Object.fromEntries(actors.map((a) => [a.id, a]))

  const entityTypes = ["GoalSheet", "Goal", "Achievement", "User", "GoalCycle", "ThrustArea"]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Trail</h1>
        <p className="mt-1 text-sm text-muted-foreground">{total} entries total</p>
      </div>
      <AuditLogView
        logs={logs}
        actorMap={actorMap}
        entityTypes={entityTypes}
        currentEntityType={entityTypeFilter}
        page={page}
        pageSize={pageSize}
        total={total}
      />
    </div>
  )
}
