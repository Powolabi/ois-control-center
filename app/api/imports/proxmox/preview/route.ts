import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateImportPreview } from "@/lib/imports/import-service"

const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
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

    const buffer = Buffer.from(await file.arrayBuffer())
    const preview = await generateImportPreview(buffer, session.user.id)

    return NextResponse.json(preview)
  } catch (error: any) {
    console.error("Error generating import preview:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate preview" },
      { status: 500 }
    )
  }
}
