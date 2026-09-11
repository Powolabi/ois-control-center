import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createMonitorSchema } from '@/lib/monitoring/validation'
import { generateHeartbeatToken, hashHeartbeatToken } from '@/lib/monitoring/check-executor'
import { createAuditEvent } from '@/lib/audit'
import { CheckType } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createMonitorSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verify system exists
    const system = await prisma.system.findUnique({
      where: { id: data.systemId },
    })

    if (!system) {
      return NextResponse.json({ error: 'System not found' }, { status: 404 })
    }

    // Create monitor with appropriate config
    const monitor = await prisma.$transaction(async (tx) => {
      const mon = await tx.monitor.create({
        data: {
          systemId: data.systemId,
          name: data.name,
          checkType: data.checkType,
          enabled: data.enabled,
          intervalSeconds: data.intervalSeconds,
          timeoutMs: data.timeoutMs,
          failureThreshold: data.failureThreshold,
          recoveryThreshold: data.recoveryThreshold,
          nextCheckAt: data.enabled ? new Date() : null,
        },
      })

      // Create type-specific config
      if (data.checkType === CheckType.HTTP && data.httpUrl) {
        await tx.httpCheckConfig.create({
          data: {
            monitorId: mon.id,
            url: data.httpUrl,
            method: data.httpMethod,
            expectedStatusMin: data.httpExpectedStatusMin,
            expectedStatusMax: data.httpExpectedStatusMax,
            followRedirects: data.httpFollowRedirects,
            maxRedirects: data.httpMaxRedirects,
            validateTls: data.httpValidateTls,
            expectedText: data.httpExpectedText || null,
          },
        })
      } else if (data.checkType === CheckType.TCP && data.tcpHost && data.tcpPort) {
        await tx.tcpCheckConfig.create({
          data: {
            monitorId: mon.id,
            host: data.tcpHost,
            port: data.tcpPort,
          },
        })
      } else if (data.checkType === CheckType.HEARTBEAT) {
        const token = generateHeartbeatToken()
        const hash = hashHeartbeatToken(token)
        
        await tx.heartbeatCheckConfig.create({
          data: {
            monitorId: mon.id,
            tokenHash: hash,
          },
        })
        
        // Return token only on creation
        ;(mon as any).heartbeatToken = token
      }

      return mon
    })

    await createAuditEvent({
      action: 'MONITOR_CREATED',
      entityId: monitor.id,
      userId: session.user.id,
      systemId: data.systemId,
      metadata: { name: data.name, checkType: data.checkType },
    })

    return NextResponse.json(monitor, { status: 201 })
  } catch (error: any) {
    console.error('Error creating monitor:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const systemId = searchParams.get('systemId')
    const enabled = searchParams.get('enabled')
    const health = searchParams.get('health')

    const where: any = { archivedAt: null }
    
    if (systemId) where.systemId = systemId
    if (enabled !== null) where.enabled = enabled === 'true'
    if (health) where.currentHealth = health

    const monitors = await prisma.monitor.findMany({
      where,
      include: {
        system: { select: { id: true, name: true, type: true } },
        _count: {
          select: {
            checkResults: true,
            incidents: { where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(monitors)
  } catch (error: any) {
    console.error('Error fetching monitors:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
