import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getImportRunDetails } from "@/lib/imports/import-service"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const run = await getImportRunDetails(id, session.user.id)

    if (!run) {
      return NextResponse.json(
        { error: "Import run not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(run)
  } catch (error: any) {
    console.error("Error fetching import run:", error)
    return NextResponse.json(
      { error: "Failed to fetch import run details" },
      { status: 500 }
    )
  }
}
