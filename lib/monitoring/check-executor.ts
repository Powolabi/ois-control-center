import { Monitor, HealthStatus, CheckType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { validateURL, validateTCPTarget, getSSRFOptionsFromEnv } from './ssrf-protection'
import crypto from 'crypto'

const MAX_RESPONSE_SIZE = 1024 * 1024 // 1MB
const MAX_EXPECTED_TEXT_LENGTH = 1000

type MonitorWithConfig = Monitor & {
  httpConfig?: { url: string; method: string; expectedStatusMin: number; expectedStatusMax: number; followRedirects: boolean; maxRedirects: number; validateTls: boolean; expectedText: string | null } | null
  tcpConfig?: { host: string; port: number } | null
  heartbeatConfig?: { tokenHash: string; lastSeenAt: Date | null } | null
}

interface CheckExecutionResult {
  success: boolean
  healthResult: HealthStatus
  responseTimeMs?: number
  httpStatus?: number
  errorCode?: string
  errorSummary?: string
}

/**
 * Execute an HTTP check
 */
async function executeHttpCheck(
  config: NonNullable<MonitorWithConfig['httpConfig']>,
  timeoutMs: number
): Promise<CheckExecutionResult> {
  const startTime = Date.now()
  
  try {
    // Validate URL with SSRF protection
    const ssrfOptions = getSSRFOptionsFromEnv()
    const validation = await validateURL(config.url, ssrfOptions)
    
    if (!validation.allowed) {
      return {
        success: false,
        healthResult: HealthStatus.DOWN,
        errorCode: 'SSRF_BLOCKED',
        errorSummary: validation.reason || 'URL blocked by security policy',
      }
    }
    
    // Execute HTTP request
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    
    try {
      const response = await fetch(config.url, {
        method: config.method,
        signal: controller.signal,
        redirect: config.followRedirects ? 'follow' : 'manual',
        headers: {
          'User-Agent': 'OIS-ControlCenter-Monitor/1.0',
        },
      })
      
      clearTimeout(timeout)
      
      const responseTimeMs = Date.now() - startTime
      
      // Check status code
      const statusOk = response.status >= config.expectedStatusMin && 
                       response.status <= config.expectedStatusMax
      
      if (!statusOk) {
        return {
          success: false,
          healthResult: HealthStatus.DOWN,
          responseTimeMs,
          httpStatus: response.status,
          errorCode: 'HTTP_STATUS',
          errorSummary: `Unexpected status ${response.status}`,
        }
      }
      
      // Check expected text if configured
      if (config.expectedText) {
        const text = await response.text()
        const limitedText = text.substring(0, MAX_EXPECTED_TEXT_LENGTH)
        
        if (!limitedText.includes(config.expectedText)) {
          return {
            success: false,
            healthResult: HealthStatus.DOWN,
            responseTimeMs,
            httpStatus: response.status,
            errorCode: 'TEXT_MISMATCH',
            errorSummary: 'Expected text not found in response',
          }
        }
      }
      
      return {
        success: true,
        healthResult: HealthStatus.HEALTHY,
        responseTimeMs,
        httpStatus: response.status,
      }
    } finally {
      clearTimeout(timeout)
    }
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        healthResult: HealthStatus.DOWN,
        responseTimeMs,
        errorCode: 'TIMEOUT',
        errorSummary: `Request timed out after ${timeoutMs}ms`,
      }
    }
    
    return {
      success: false,
      healthResult: HealthStatus.DOWN,
      responseTimeMs,
      errorCode: error.code || 'FETCH_ERROR',
      errorSummary: sanitizeErrorMessage(error.message),
    }
  }
}

/**
 * Execute a TCP check
 */
async function executeTcpCheck(
  config: NonNullable<MonitorWithConfig['tcpConfig']>,
  timeoutMs: number
): Promise<CheckExecutionResult> {
  const startTime = Date.now()
  
  try {
    // Validate target with SSRF protection
    const ssrfOptions = getSSRFOptionsFromEnv()
    const validation = await validateTCPTarget(config.host, config.port, ssrfOptions)
    
    if (!validation.allowed) {
      return {
        success: false,
        healthResult: HealthStatus.DOWN,
        errorCode: 'SSRF_BLOCKED',
        errorSummary: validation.reason || 'Target blocked by security policy',
      }
    }
    
    // Attempt TCP connection
    const net = await import('net')
    
    return new Promise((resolve) => {
      const socket = new net.Socket()
      let resolved = false
      
      const cleanup = () => {
        if (!resolved) {
          resolved = true
          socket.destroy()
        }
      }
      
      const timeout = setTimeout(() => {
        cleanup()
        resolve({
          success: false,
          healthResult: HealthStatus.DOWN,
          responseTimeMs: Date.now() - startTime,
          errorCode: 'TIMEOUT',
          errorSummary: `Connection timed out after ${timeoutMs}ms`,
        })
      }, timeoutMs)
      
      socket.on('connect', () => {
        clearTimeout(timeout)
        const responseTimeMs = Date.now() - startTime
        cleanup()
        resolve({
          success: true,
          healthResult: HealthStatus.HEALTHY,
          responseTimeMs,
        })
      })
      
      socket.on('error', (error: any) => {
        clearTimeout(timeout)
        const responseTimeMs = Date.now() - startTime
        cleanup()
        resolve({
          success: false,
          healthResult: HealthStatus.DOWN,
          responseTimeMs,
          errorCode: error.code || 'CONNECTION_ERROR',
          errorSummary: sanitizeErrorMessage(error.message),
        })
      })
      
      socket.connect(config.port, config.host)
    })
  } catch (error: any) {
    return {
      success: false,
      healthResult: HealthStatus.DOWN,
      responseTimeMs: Date.now() - startTime,
      errorCode: error.code || 'TCP_ERROR',
      errorSummary: sanitizeErrorMessage(error.message),
    }
  }
}

/**
 * Execute a heartbeat check
 */
async function executeHeartbeatCheck(
  config: NonNullable<MonitorWithConfig['heartbeatConfig']>,
  maxAgeMs: number
): Promise<CheckExecutionResult> {
  try {
    if (!config.lastSeenAt) {
      return {
        success: false,
        healthResult: HealthStatus.DOWN,
        errorCode: 'NO_HEARTBEAT',
        errorSummary: 'No heartbeat received yet',
      }
    }
    
    const ageMs = Date.now() - config.lastSeenAt.getTime()
    
    if (ageMs > maxAgeMs) {
      return {
        success: false,
        healthResult: HealthStatus.DOWN,
        errorCode: 'HEARTBEAT_STALE',
        errorSummary: `Last heartbeat ${Math.floor(ageMs / 1000)}s ago`,
      }
    }
    
    return {
      success: true,
      healthResult: HealthStatus.HEALTHY,
    }
  } catch (error: any) {
    return {
      success: false,
      healthResult: HealthStatus.DOWN,
      errorCode: 'HEARTBEAT_ERROR',
      errorSummary: sanitizeErrorMessage(error.message),
    }
  }
}

/**
 * Calculate new health status based on check result and thresholds
 */
function calculateHealthStatus(
  monitor: Monitor,
  checkSuccess: boolean
): { health: HealthStatus; consecutiveFailures: number; consecutiveSuccesses: number } {
  if (!monitor.enabled) {
    return {
      health: HealthStatus.PAUSED,
      consecutiveFailures: monitor.consecutiveFailures,
      consecutiveSuccesses: monitor.consecutiveSuccesses,
    }
  }
  
  let consecutiveFailures = monitor.consecutiveFailures
  let consecutiveSuccesses = monitor.consecutiveSuccesses
  
  if (checkSuccess) {
    consecutiveSuccesses++
    consecutiveFailures = 0
    
    // Recovery threshold met
    if (consecutiveSuccesses >= monitor.recoveryThreshold) {
      return { health: HealthStatus.HEALTHY, consecutiveFailures, consecutiveSuccesses }
    }
    
    // Still recovering
    if (monitor.currentHealth === HealthStatus.DOWN || monitor.currentHealth === HealthStatus.DEGRADED) {
      return { health: HealthStatus.DEGRADED, consecutiveFailures, consecutiveSuccesses }
    }
    
    return { health: HealthStatus.HEALTHY, consecutiveFailures, consecutiveSuccesses }
  } else {
    consecutiveFailures++
    consecutiveSuccesses = 0
    
    // Failure threshold met
    if (consecutiveFailures >= monitor.failureThreshold) {
      return { health: HealthStatus.DOWN, consecutiveFailures, consecutiveSuccesses }
    }
    
    // Degraded state
    return { health: HealthStatus.DEGRADED, consecutiveFailures, consecutiveSuccesses }
  }
}

/**
 * Sanitize error messages to avoid leaking sensitive information
 */
function sanitizeErrorMessage(message: string): string {
  // Remove potential file paths
  message = message.replace(/\/[^\s]+/g, '[path]')
  
  // Remove potential IPs
  message = message.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[ip]')
  
  // Truncate long messages
  if (message.length > 500) {
    message = message.substring(0, 500) + '...'
  }
  
  return message
}

/**
 * Execute a check and update monitor state
 */
export async function executeCheck(
  monitorId: string,
  workerIdentifier: string
): Promise<void> {
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
    include: {
      httpConfig: true,
      tcpConfig: true,
      heartbeatConfig: true,
      system: true,
    },
  })
  
  if (!monitor) {
    throw new Error('Monitor not found')
  }
  
  if (!monitor.enabled) {
    return
  }
  
  const startedAt = new Date()
  let result: CheckExecutionResult
  
  // Execute check based on type
  switch (monitor.checkType) {
    case CheckType.HTTP:
      if (!monitor.httpConfig) {
        throw new Error('HTTP config missing')
      }
      result = await executeHttpCheck(monitor.httpConfig, monitor.timeoutMs)
      break
      
    case CheckType.TCP:
      if (!monitor.tcpConfig) {
        throw new Error('TCP config missing')
      }
      result = await executeTcpCheck(monitor.tcpConfig, monitor.timeoutMs)
      break
      
    case CheckType.HEARTBEAT:
      if (!monitor.heartbeatConfig) {
        throw new Error('Heartbeat config missing')
      }
      // Heartbeat check interval is treated as the max age
      result = await executeHeartbeatCheck(
        monitor.heartbeatConfig,
        monitor.intervalSeconds * 1000 * 2 // 2x interval as grace period
      )
      break
      
    default:
      throw new Error(`Unknown check type: ${monitor.checkType}`)
  }
  
  const completedAt = new Date()
  
  // Calculate new health status
  const { health, consecutiveFailures, consecutiveSuccesses } = calculateHealthStatus(
    monitor,
    result.success
  )
  
  // Save check result and update monitor in transaction
  await prisma.$transaction(async (tx) => {
    // Create check result
    const checkResult = await tx.checkResult.create({
      data: {
        monitorId: monitor.id,
        startedAt,
        completedAt,
        success: result.success,
        healthResult: result.healthResult,
        responseTimeMs: result.responseTimeMs,
        httpStatus: result.httpStatus,
        errorCode: result.errorCode,
        errorSummary: result.errorSummary,
        workerIdentifier,
      },
    })
    
    // Update monitor
    const wasDown = monitor.currentHealth === HealthStatus.DOWN
    const isNowDown = health === HealthStatus.DOWN
    const wasHealthy = monitor.currentHealth === HealthStatus.HEALTHY
    const isNowHealthy = health === HealthStatus.HEALTHY
    
    await tx.monitor.update({
      where: { id: monitor.id },
      data: {
        currentHealth: health,
        consecutiveFailures,
        consecutiveSuccesses,
        lastCheckedAt: completedAt,
        nextCheckAt: new Date(Date.now() + monitor.intervalSeconds * 1000),
      },
    })
    
    // Handle incident lifecycle
    const existingIncident = await tx.incident.findFirst({
      where: {
        monitorId: monitor.id,
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
      },
    })
    
    // Open new incident if threshold reached
    if (!wasDown && isNowDown && !existingIncident) {
      await tx.incident.create({
        data: {
          monitorId: monitor.id,
          systemId: monitor.systemId,
          status: 'OPEN',
          failureSummary: result.errorSummary || 'Monitor health check failed',
          firstFailedResultId: checkResult.id,
          openedAt: completedAt,
        },
      })
    }
    
    // Resolve incident if recovered
    if (wasDown && isNowHealthy && existingIncident) {
      await tx.incident.update({
        where: { id: existingIncident.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: completedAt,
          recoveryResultId: checkResult.id,
        },
      })
    }
  })
}

/**
 * Generate a secure heartbeat token
 */
export function generateHeartbeatToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Hash a heartbeat token for storage
 */
export function hashHeartbeatToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Verify a heartbeat token
 */
export async function verifyHeartbeatToken(token: string): Promise<string | null> {
  const hash = hashHeartbeatToken(token)
  
  const config = await prisma.heartbeatCheckConfig.findUnique({
    where: { tokenHash: hash },
    include: { monitor: true },
  })
  
  if (!config || !config.monitor.enabled) {
    return null
  }
  
  return config.monitorId
}

/**
 * Record heartbeat
 */
export async function recordHeartbeat(monitorId: string): Promise<void> {
  await prisma.heartbeatCheckConfig.update({
    where: { monitorId },
    data: { lastSeenAt: new Date() },
  })
}
