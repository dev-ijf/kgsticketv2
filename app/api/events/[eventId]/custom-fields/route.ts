import { NextRequest, NextResponse } from "next/server"
import { getEventCustomFields } from "@/lib/data"

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const eventId = parseInt(params.eventId)
    
    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: "Invalid event ID" },
        { status: 400 }
      )
    }

    const customFields = await getEventCustomFields(eventId)

    return NextResponse.json({
      success: true,
      data: customFields
    })
  } catch (error) {
    console.error("Error fetching custom fields:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
