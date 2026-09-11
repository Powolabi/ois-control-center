import { prisma } from "@/lib/prisma"
import { AuditAction } from "@prisma/client"

interface CreateAuditEventParams {
  action: AuditAction
  entityId: string
  userId?: string
  systemId?: string
  metadata?: Record<string, any>
}

export async function createAuditEvent({
  action,
  entityId,
  userId,
  systemId,
  metadata,
}: CreateAuditEventParams) {
  const safeMetadata = metadata ? sanitizeMetadata(metadata) : undefined

  return prisma.auditEvent.create({
    data: {
      action,
      entityId,
      userId,
      systemId,
      metadata: safeMetadata,
    },
  })
}

function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'password',
    'secret',
    'token',
    'key',
    'apikey',
    'api_key',
    'credential',
    'auth',
  ]

  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(metadata)) {
    const keyLower = key.toLowerCase()
    const isSensitive = sensitiveKeys.some(sk => keyLower.includes(sk))
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeMetadata(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}
