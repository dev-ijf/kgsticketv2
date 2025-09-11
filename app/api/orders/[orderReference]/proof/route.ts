import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/neon"

export async function POST(request: NextRequest, { params }: { params: { orderReference: string } }) {
  const { orderReference } = params
  const body = await request.json()
  const { proof_transfer } = body
  if (!proof_transfer) {
    return NextResponse.json({ error: "URL bukti transfer wajib diisi" }, { status: 400 })
  }
  const orderResult = await sql`
    SELECT o.id, pc.category
    FROM orders o
    JOIN payment_channels pc ON o.payment_channel_id = pc.id
    WHERE o.order_reference = ${orderReference}
  `

  if (orderResult.length === 0) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 })
  }

  const order = orderResult[0]
  const channelCategory = order.category

  if (channelCategory !== "bank_transfer" && channelCategory !== "qris_statis") {
    return NextResponse.json({ error: "Hanya untuk bank transfer dan QRIS statis" }, { status: 400 })
  }

  try {
    await sql`
      UPDATE orders 
      SET proof_transfer = ${proof_transfer}
      WHERE id = ${order.id}
    `
  } catch (updateError) {
    return NextResponse.json({ error: "Gagal update bukti transfer" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
