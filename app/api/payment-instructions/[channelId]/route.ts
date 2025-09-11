import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/neon"

export async function GET(request: NextRequest, { params }: { params: { channelId: string } }) {
  try {
    const instructions = await sql`
      SELECT * FROM payment_instructions
      WHERE payment_channel_id = ${params.channelId}
      ORDER BY step_order ASC
    `

    return NextResponse.json({
      success: true,
      instructions: instructions || [],
    })
  } catch (error) {
    console.error("Error fetching payment instructions:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch instructions" }, { status: 500 })
  }
}
