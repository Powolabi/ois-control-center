import { prisma } from '@/lib/prisma'
import { executeCheck } from './check-executor'
import os from 'os'
import crypto from 'crypto'

const WORKER_ID = `worker-${os.hostname()}-${process.pid}-${crypto.randomBytes(4).toString('hex')}`
const LEASE_DURATION_SECONDS = parseInt(process.env.MONITOR_WORKER_LEASE_SECONDS || '60')
const MAX_CONCURRENCY = parseInt(process.env.MONITOR_MAX_CONCURRENCY || '10')
const POLL_INTERVAL_MS = 5000

let running = false
let activeChecks = 0
let shutdownRequested = false

/**
 * Claim due monitors atomically
 */
async function claimDueMonitors(limit: number): Promise<string[]> {
  const now = new Date()
  const leaseExpiry = new Date(now.getTime() + LEASE_DURATION_SECONDS * 1000)
  
  // Find monitors that are due and not leased (or lease expired)
  const monitors = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE monitors
    SET "workerLeaseOwner" = ${WORKER_ID},
        "workerLeaseExpiry" = ${leaseExpiry}
    WHERE id IN (
      SELECT id FROM monitors
      WHERE enabled = true
        AND "archivedAt" IS NULL
        AND (
          "nextCheckAt" IS NULL
          OR "nextCheckAt" <= ${now}
        )
        AND (
          "workerLeaseOwner" IS NULL
          OR "workerLeaseExpiry" IS NULL
          OR "workerLeaseExpiry" < ${now}
        )
      ORDER BY "nextCheckAt" NULLS FIRST
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id
  `
  
  return monitors.map(m => m.id)
}

/**
 * Release a monitor lease
 */
async function releaseLease(monitorId: string): Promise<void> {
  await prisma.monitor.updateMany({
    where: {
      id: monitorId,
      workerLeaseOwner: WORKER_ID,
    },
    data: {
      workerLeaseOwner: null,
      workerLeaseExpiry: null,
    },
  })
}

/**
 * Recover expired leases
 */
async function recoverExpiredLeases(): Promise<number> {
  const result = await prisma.monitor.updateMany({
    where: {
      workerLeaseExpiry: {
        lt: new Date(),
      },
      workerLeaseOwner: {
        not: null,
      },
    },
    data: {
      workerLeaseOwner: null,
      workerLeaseExpiry: null,
    },
  })
  
  return result.count
}

/**
 * Process a single monitor check
 */
async function processMonitor(monitorId: string): Promise<void> {
  activeChecks++
  
  try {
    await executeCheck(monitorId, WORKER_ID)
  } catch (error) {
    console.error(`Error executing check for monitor ${monitorId}:`, error)
  } finally {
    await releaseLease(monitorId)
    activeChecks--
  }
}

/**
 * Main worker loop
 */
async function workerLoop(): Promise<void> {
  while (running && !shutdownRequested) {
    try {
      // Recover expired leases periodically
      const recovered = await recoverExpiredLeases()
      if (recovered > 0) {
        console.log(`Recovered ${recovered} expired leases`)
      }
      
      // Claim monitors up to concurrency limit
      const availableSlots = MAX_CONCURRENCY - activeChecks
      if (availableSlots > 0) {
        const claimedIds = await claimDueMonitors(availableSlots)
        
        if (claimedIds.length > 0) {
          console.log(`Claimed ${claimedIds.length} monitors for checking`)
          
          // Start checks without waiting
          for (const monitorId of claimedIds) {
            processMonitor(monitorId).catch(err => {
              console.error(`Fatal error processing monitor ${monitorId}:`, err)
            })
          }
        }
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    } catch (error) {
      console.error('Error in worker loop:', error)
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  }
}

/**
 * Start the worker
 */
export async function startWorker(): Promise<void> {
  if (running) {
    throw new Error('Worker already running')
  }
  
  running = true
  shutdownRequested = false
  
  console.log(`Starting monitoring worker: ${WORKER_ID}`)
  console.log(`Max concurrency: ${MAX_CONCURRENCY}`)
  console.log(`Lease duration: ${LEASE_DURATION_SECONDS}s`)
  
  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('Shutdown signal received, waiting for active checks to complete...')
    shutdownRequested = true
    
    // Wait for active checks to complete
    const startWait = Date.now()
    while (activeChecks > 0 && Date.now() - startWait < 30000) {
      console.log(`Waiting for ${activeChecks} active checks...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    if (activeChecks > 0) {
      console.log(`Forcing shutdown with ${activeChecks} active checks remaining`)
    }
    
    running = false
    console.log('Worker stopped')
    process.exit(0)
  }
  
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
  
  // Start worker loop
  await workerLoop()
}

/**
 * Get worker status
 */
export function getWorkerStatus() {
  return {
    workerId: WORKER_ID,
    running,
    activeChecks,
    maxConcurrency: MAX_CONCURRENCY,
    shutdownRequested,
  }
}
