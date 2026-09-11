import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { systemSchema } from "@/lib/validations"
import { createAuditEvent } from "@/lib/audit"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const system = await prisma.system.findUnique({
      where: { id },
      include: {
        location: true,
        parentSystem: true,
        childSystems: true,
        dependenciesFrom: {
          include: { targetSystem: true },
        },
        dependenciesTo: {
          include: { sourceSystem: true },
        },
        endpoints: true,
      },
    })

    if (!system) {
      return NextResponse.json({ error: "System not found" }, { status: 404 })
    }

    return NextResponse.json(system)
  } catch (error: any) {
    console.error("Error fetching system:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    
    const existing = await prisma.system.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: "System not found" }, { status: 404 })
    }

    const validationResult = systemSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validationResult.data

    if (data.parentSystemId === id) {
      return NextResponse.json(
        { error: "A system cannot be its own parent" },
        { status: 400 }
      )
    }

    if (data.parentSystemId && data.parentSystemId !== existing.parentSystemId) {
      const hasCircular = await checkCircularHierarchy(
        data.parentSystemId,
        [id]
      )
      if (hasCircular) {
        return NextResponse.json(
          { error: "Circular hierarchy detected" },
          { status: 400 }
        )
      }
    }

    const system = await prisma.system.update({
      where: { id },
      data: {
        ...data,
        slug: existing.slug,
      },
    })

    await createAuditEvent({
      action: data.parentSystemId !== existing.parentSystemId 
        ? "SYSTEM_PARENT_CHANGED" 
        : "SYSTEM_UPDATED",
      entityId: system.id,
      userId: session.user.id,
      systemId: system.id,
      metadata: { name: system.name },
    })

    return NextResponse.json(system)
  } catch (error: any) {
    console.error("Error updating system:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const system = await prisma.system.findUnique({
      where: { id },
    })

    if (!system) {
      return NextResponse.json({ error: "System not found" }, { status: 404 })
    }

    await prisma.system.update({
      where: { id },
      data: { archivedAt: new Date() },
    })

    await createAuditEvent({
      action: "SYSTEM_ARCHIVED",
      entityId: id,
      userId: session.user.id,
      systemId: id,
      metadata: { name: system.name },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error archiving system:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function checkCircularHierarchy(
  systemId: string,
  visited: string[]
): Promise<boolean> {
  if (visited.includes(systemId)) {
    return true
  }

  const system = await prisma.system.findUnique({
    where: { id: systemId },
    select: { parentSystemId: true },
  })

  if (!system || !system.parentSystemId) {
    return false
  }

  return checkCircularHierarchy(system.parentSystemId, [...visited, systemId])
}
