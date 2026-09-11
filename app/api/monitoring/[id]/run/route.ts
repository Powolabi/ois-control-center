import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditEvent } from '@/lib/audit'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const monitor = await prisma.monitor.findUnique({
      where: { id },
    })

    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    if (!monitor.enabled) {
      return NextResponse.json({ error: 'Monitor is disabled' }, { status: 400 })
    }

    // Check if already leased
    if (monitor.workerLeaseOwner && monitor.workerLeaseExpiry && monitor.workerLeaseExpiry > new Date()) {
      return NextResponse.json({ error: 'Check already in progress' }, { status: 409 })
    }

    // Schedule immediate check by setting nextCheckAt to now
    await prisma.monitor.update({
      where: { id },
      data: { nextCheckAt: new Date() },
    })

    await createAuditEvent({
      action: 'MANUAL_CHECK_REQUESTED',
      entityId: id,
      userId: session.user.id,
      systemId: monitor.systemId,
      metadata: { name: monitor.name },
    })

    return NextResponse.json({ success: true, message: 'Check scheduled' })
  } catch (error: any) {
    console.error('Error scheduling check:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
