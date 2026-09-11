import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { executeProxmoxImport } from "@/lib/imports/import-service"
import { z } from "zod"

const MAX_FILE_SIZE = 10 * 1024 * 1024

const conflictResolutionSchema = z.object({
  externalId: z.string(),
  action: z.enum(["match_existing", "create_new", "skip"]),
  systemId: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const locationId = formData.get("locationId") as string
    const conflictResolutionsJson = formData.get("conflictResolutions") as string

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 }
      )
    }

    if (file.type !== "application/json") {
      return NextResponse.json(
        { error: "File must be JSON" },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      )
    }

    let conflictResolutions: z.infer<typeof conflictResolutionSchema>[] = []
    if (conflictResolutionsJson) {
      try {
        const parsed = JSON.parse(conflictResolutionsJson)
        conflictResolutions = z.array(conflictResolutionSchema).parse(parsed)
      } catch (error: any) {
        return NextResponse.json(
          { error: "Invalid conflict resolutions format" },
          { status: 400 }
        )
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await executeProxmoxImport(
      buffer,
      session.user.id,
      locationId,
      conflictResolutions
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error executing import:", error)
    return NextResponse.json(
      { error: error.message || "Failed to execute import" },
      { status: 500 }
    )
  }
}
