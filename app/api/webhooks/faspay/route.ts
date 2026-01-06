import { type NextRequest, NextResponse } from "next/server"
import { getOrderWithDetails, updateOrderStatus, createPaymentLog, createTicketsFromAttendees } from "@/lib/data"
import { generateFaspaySignature } from "@/lib/faspay-utils"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      trx_id,
      bill_no,
      payment_status_code,
      signature,
      payment_date,
      payment_channel,
      payment_channel_uid,
      payment_status_desc,
      merchant_id,
      merchant,
      payment_reff,
      bill_total,
      payment_total,
    } = body

    // 1. Validasi signature
    const expectedSignature = generateFaspaySignature(bill_no + payment_status_code)
    if (signature !== expectedSignature) {
      await createPaymentLog({
        order_reference: bill_no,
        log_type: "invalid_signature",
        request_payload: body,
        virtual_account_number: trx_id,
      })
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // 2. Cari order berdasarkan virtual_account_number (trx_id)
    const order = await getOrderWithDetails(bill_no)
    if (!order || order.virtual_account_number !== trx_id) {
      await createPaymentLog({
        order_reference: bill_no,
        log_type: "order_not_found_or_va_mismatch",
        request_payload: body,
        virtual_account_number: trx_id,
      })
      return NextResponse.json({ error: "Order not found or VA mismatch" }, { status: 404 })
    }

    // 3. Jika payment_status_code == "2", update status jadi paid, insert ticket
    const responseCode = payment_status_code === "2" ? "00" : payment_status_code
    const statusDescriptions = {
      "0": "Unprocessed",
      "1": "In Process",
      "2": "Payment Success",
      "3": "Payment Failed",
      "4": "Payment Reversal",
      "5": "No bills found",
      "7": "Payment Expired",
      "8": "Payment Cancelled",
      "9": "Unknown",
    }
    const codeStr = String(payment_status_code)
    const responseDesc = statusDescriptions[codeStr as keyof typeof statusDescriptions] || "Unknown"

    if (payment_status_code === "2" && order.status !== "paid") {
      // Update status order
      await updateOrderStatus(order.order_reference, "paid", payment_date)
      console.log(`✅ Order ${order.order_reference} status updated to paid`)

      // Create tickets from order_item_attendees (via coding, not trigger)
      try {
        console.log(`[WEBHOOK] Creating tickets from attendees for order_id: ${order.id}`)
        const result = await createTicketsFromAttendees(order.id)
        console.log(`✅ Tickets created: ${result.ticketsCreated}, Custom fields processed: ${result.customFieldsProcessed}`)
      } catch (ticketError) {
        console.error(`❌ Error creating tickets from attendees:`, ticketError)
        // Don't throw - log the error but continue with webhook response
      }

      // Kirim WhatsApp paid via QStash
      const { scheduleNotification } = await import("@/lib/qstash")
      await scheduleNotification(order.order_reference, "whatsapp", 0, { paid: true })
    }

    // 4. Log ke payment_logs
    await createPaymentLog({
      order_reference: bill_no,
      log_type: "callback",
      request_payload: body,
      virtual_account_number: trx_id,
    })

    // 5. Response ke Faspay
    const responsePayload = {
      response: "Payment Notification",
      trx_id,
      merchant_id: merchant_id || "35802",
      merchant: merchant || "Indonesia Juara",
      bill_no,
      response_code: responseCode,
      response_desc: responseDesc,
      response_date: new Date().toISOString().slice(0, 19).replace("T", " "),
    }
    const response = NextResponse.json(responsePayload)

    return response
  } catch (error) {
    console.error("Faspay webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Faspay webhook endpoint is active",
    timestamp: new Date().toISOString(),
  })
}
