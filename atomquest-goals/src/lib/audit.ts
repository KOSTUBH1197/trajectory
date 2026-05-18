import { db } from "./db"

interface AuditInput {
  actorId: string
  entityType: string
  entityId: string
  action: string
  before?: unknown
  after?: unknown
  reason?: string
}

export async function logAudit({
  actorId,
  entityType,
  entityId,
  action,
  before,
  after,
  reason,
}: AuditInput) {
  await db.auditLog.create({
    data: {
      actorId,
      entityType,
      entityId,
      action,
      before: before ? JSON.parse(JSON.stringify(before)) : undefined,
      after: after ? JSON.parse(JSON.stringify(after)) : undefined,
      reason,
    },
  })
}
