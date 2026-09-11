import { z } from 'zod'
import { CheckType } from '@prisma/client'

export const createMonitorSchema = z.object({
  systemId: z.string().min(1),
  name: z.string().min(1).max(255),
  checkType: z.nativeEnum(CheckType),
  enabled: z.boolean().default(true),
  intervalSeconds: z.number().int().min(10).max(86400).default(60),
  timeoutMs: z.number().int().min(1000).max(60000).default(10000),
  failureThreshold: z.number().int().min(1).max(10).default(3),
  recoveryThreshold: z.number().int().min(1).max(10).default(2),
  
  // HTTP config
  httpUrl: z.string().url().optional(),
  httpMethod: z.enum(['GET', 'HEAD']).default('GET'),
  httpExpectedStatusMin: z.number().int().min(100).max(599).default(200),
  httpExpectedStatusMax: z.number().int().min(100).max(599).default(299),
  httpFollowRedirects: z.boolean().default(true),
  httpMaxRedirects: z.number().int().min(0).max(10).default(5),
  httpValidateTls: z.boolean().default(true),
  httpExpectedText: z.string().max(1000).optional(),
  
  // TCP config
  tcpHost: z.string().optional(),
  tcpPort: z.number().int().min(1).max(65535).optional(),
}).refine(
  (data) => {
    if (data.checkType === CheckType.HTTP) {
      return !!data.httpUrl
    }
    if (data.checkType === CheckType.TCP) {
      return !!data.tcpHost && !!data.tcpPort
    }
    return true
  },
  { message: 'Required configuration missing for check type' }
)

export type CreateMonitorInput = z.infer<typeof createMonitorSchema>
