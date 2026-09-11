import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getImportHistory } from "@/lib/imports/import-service"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const history = await getImportHistory(session.user.id, limit, offset)

    return NextResponse.json(history)
  } catch (error: any) {
    console.error("Error fetching import history:", error)
    return NextResponse.json(
      { error: "Failed to fetch import history" },
      { status: 500 }
    )
  }
}
