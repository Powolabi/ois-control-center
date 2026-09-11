import { NextResponse } from 'next/server'
import { verifyHeartbeatToken, recordHeartbeat } from '@/lib/monitoring/check-executor'

interface RouteParams {
  params: Promise<{ token: string }>
}

// Rate limiting map (in-memory, simple implementation)
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10

function checkRateLimit(monitorId: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(monitorId) || []
  
  // Remove old timestamps
  const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS)
  
  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }
  
  recentTimestamps.push(now)
  rateLimitMap.set(monitorId, recentTimestamps)
  
  return true
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { token } = await params

    const monitorId = await verifyHeartbeatToken(token)

    if (!monitorId) {
      return NextResponse.json({ error: 'Invalid or disabled heartbeat token' }, { status: 401 })
    }

    // Check rate limit
    if (!checkRateLimit(monitorId)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    await recordHeartbeat(monitorId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error recording heartbeat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
