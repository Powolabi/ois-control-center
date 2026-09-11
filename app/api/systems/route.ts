import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { systemSchema } from "@/lib/validations"
import { createAuditEvent } from "@/lib/audit"
import { slugify } from "@/lib/utils"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = systemSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validationResult.data
    const slug = slugify(data.name)

    const existingSlug = await prisma.system.findUnique({
      where: { slug },
    })

    if (existingSlug) {
      return NextResponse.json(
        { error: "A system with this name already exists" },
        { status: 400 }
      )
    }

    if (data.parentSystemId) {
      const hasCircular = await checkCircularHierarchy(
        data.parentSystemId,
        []
      )
      if (hasCircular) {
        return NextResponse.json(
          { error: "Circular hierarchy detected" },
          { status: 400 }
        )
      }
    }

    const system = await prisma.system.create({
      data: {
        ...data,
        slug,
      },
    })

    await createAuditEvent({
      action: "SYSTEM_CREATED",
      entityId: system.id,
      userId: session.user.id,
      systemId: system.id,
      metadata: { name: system.name, type: system.type },
    })

    return NextResponse.json(system, { status: 201 })
  } catch (error: any) {
    console.error("Error creating system:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
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
