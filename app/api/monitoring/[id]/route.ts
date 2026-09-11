import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditEvent } from '@/lib/audit'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const monitor = await prisma.monitor.findUnique({
      where: { id },
      include: {
        system: true,
        httpConfig: true,
        tcpConfig: true,
        heartbeatConfig: { select: { id: true, lastSeenAt: true, monitorId: true } },
        checkResults: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        incidents: {
          orderBy: { openedAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    return NextResponse.json(monitor)
  } catch (error: any) {
    console.error('Error fetching monitor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const monitor = await prisma.monitor.update({
      where: { id },
      data: { archivedAt: new Date(), enabled: false },
    })

    await createAuditEvent({
      action: 'MONITOR_ARCHIVED',
      entityId: id,
      userId: session.user.id,
      systemId: monitor.systemId,
      metadata: { name: monitor.name },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error archiving monitor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
