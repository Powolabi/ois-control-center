#!/usr/bin/env tsx

import { prisma } from '../lib/prisma'

const RETENTION_DAYS = parseInt(process.env.MONITOR_RESULT_RETENTION_DAYS || '30')
const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 1000

async function cleanup() {
  console.log('OIS Control Center - Monitoring Cleanup')
  console.log('========================================')
  console.log('')
  console.log(`Retention period: ${RETENTION_DAYS} days`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log('')
  
  const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
  console.log(`Cutoff date: ${cutoffDate.toISOString()}`)
  console.log('')
  
  // Find old results not referenced by incidents
  const countResult = await prisma.checkResult.count({
    where: {
      createdAt: { lt: cutoffDate },
      AND: [
        { incidentsOpened: { none: {} } },
        { incidentsResolved: { none: {} } },
      ],
    },
  })
  
  console.log(`Found ${countResult} check results to delete`)
  
  if (DRY_RUN) {
    console.log('')
    console.log('DRY RUN - No changes made')
    console.log('Run without --dry-run flag to actually delete results')
    return
  }
  
  // Delete in batches
  let deleted = 0
  let batch = 0
  
  while (deleted < countResult) {
    batch++
    
    const results = await prisma.checkResult.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        AND: [
          { incidentsOpened: { none: {} } },
          { incidentsResolved: { none: {} } },
        ],
      },
      select: { id: true },
      take: BATCH_SIZE,
    })
    
    if (results.length === 0) break
    
    const ids = results.map(r => r.id)
    await prisma.checkResult.deleteMany({
      where: { id: { in: ids } },
    })
    
    deleted += results.length
    console.log(`Batch ${batch}: Deleted ${results.length} results (total: ${deleted})`)
  }
  
  console.log('')
  console.log(`Cleanup complete: ${deleted} results deleted`)
}

cleanup()
  .catch((error) => {
    console.error('Cleanup failed:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
