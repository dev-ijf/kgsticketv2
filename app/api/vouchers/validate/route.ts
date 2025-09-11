import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/neon"

export async function POST(request: NextRequest) {
  try {
    const { code, eventId, amount } = await request.json()

    if (!code || !eventId || !amount) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" })
    }

    const discountResult = await sql`
      SELECT 
        d.*,
        COALESCE(
          json_agg(
            json_build_object(
              'ticket_type_id', dtt.ticket_type_id,
              'event_id', tt.event_id
            )
          ) FILTER (WHERE dtt.ticket_type_id IS NOT NULL),
          '[]'::json
        ) as discount_ticket_types
      FROM discounts d
      LEFT JOIN discount_ticket_types dtt ON d.id = dtt.discount_id
      LEFT JOIN ticket_types tt ON dtt.ticket_type_id = tt.id
      WHERE d.code = ${code.toUpperCase()}
        AND d.is_active = true
      GROUP BY d.id
    `

    if (discountResult.length === 0) {
      return NextResponse.json({ success: false, error: "Kode voucher tidak ditemukan" })
    }

    const discount = discountResult[0]

    // Check if voucher is still valid
    if (discount.valid_until && new Date(discount.valid_until) < new Date()) {
      return NextResponse.json({ success: false, error: "Kode voucher sudah kedaluwarsa" })
    }

    // Check usage limit
    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
      return NextResponse.json({ success: false, error: "Kode voucher sudah mencapai batas penggunaan" })
    }

    // Check minimum amount
    if (discount.minimum_amount && amount < discount.minimum_amount) {
      return NextResponse.json({
        success: false,
        error: `Minimum pembelian ${new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
        }).format(discount.minimum_amount)}`,
      })
    }

    // Check if discount applies to this event's tickets
    if (
      discount.discount_ticket_types &&
      Array.isArray(discount.discount_ticket_types) &&
      discount.discount_ticket_types.length > 0
    ) {
      const validForEvent = discount.discount_ticket_types.some((dtt: any) => dtt.event_id === eventId)
      if (!validForEvent) {
        return NextResponse.json({ success: false, error: "Kode voucher tidak berlaku untuk event ini" })
      }
    }

    return NextResponse.json({
      success: true,
      voucher: {
        id: discount.id,
        code: discount.code,
        description: discount.description,
        discount_type: discount.discount_type,
        value: discount.value,
        max_discount_amount: discount.max_discount_amount,
      },
    })
  } catch (error) {
    console.error("Voucher validation error:", error)
    return NextResponse.json({ success: false, error: "Terjadi kesalahan sistem" }, { status: 500 })
  }
}
