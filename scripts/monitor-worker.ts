#!/usr/bin/env tsx

import { startWorker } from '../lib/monitoring/worker'

console.log('OIS Control Center - Monitoring Worker')
console.log('======================================')
console.log('')

startWorker().catch((error) => {
  console.error('Worker failed to start:', error)
  process.exit(1)
})
