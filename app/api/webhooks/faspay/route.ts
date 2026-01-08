import { type NextRequest, NextResponse } from "next/server"
import { getOrderWithDetails, updateOrderStatus, createPaymentLog, createTicketsFromAttendees } from "@/lib/data"
import { generateFaspaySignature } from "@/lib/faspay-utils"
import { sql } from "@/lib/neon"

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

      // Kirim WhatsApp paid secara async tanpa QStash
      // Jalankan di background tanpa blocking response
      ;(async () => {
        try {
          await sendWhatsAppPaidNotification(order.order_reference)
        } catch (waError) {
          console.error("❌ Error sending WhatsApp paid notification:", waError)
        }
      })().catch((err) => {
        console.error("❌ Unhandled error in WhatsApp paid notification:", err)
      })
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

// Helper function untuk mengirim WhatsApp paid notification
async function sendWhatsAppPaidNotification(orderReference: string) {
  try {
    // 1. Ambil template WhatsApp paid (id = 4)
    const notifTemplateResult = await sql`
      SELECT body FROM notification_templates
      WHERE id = 4 
        AND channel = 'whatsapp' 
        AND trigger_on = 'paid'
      LIMIT 1
    `

    if (notifTemplateResult.length === 0) {
      console.error("❌ Gagal ambil template WhatsApp paid: Template tidak ditemukan")
      return
    }

    const notifTemplate = notifTemplateResult[0]

    // 2. Ambil data order lengkap
    const orderDetail = await getOrderWithDetails(orderReference)
    if (!orderDetail) {
      console.error("❌ Gagal ambil detail order untuk WhatsApp paid")
      return
    }

    // 3. Siapkan data untuk placeholder
    const placeholderData = {
      "customer.name": orderDetail.customer?.name || "-",
      "event.name": orderDetail.event?.name || "-",
      "order.order_reference": orderDetail.order_reference || "-",
      ticket_link: `${process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || ""}/payment/${orderReference}`,
    }

    // 4. Fungsi replace placeholder
    function fillTemplate(template: string, data: Record<string, string>): string {
      let result = template
      for (const key in data) {
        result = result.replace(new RegExp(`{{${key}}}`, "g"), data[key])
      }
      return result
    }
    const messageBody = fillTemplate(notifTemplate.body, placeholderData)

    // 5. Kirim WhatsApp via fetch ke Starsender
    const starsenderUrl = process.env.STARSENDER_URL
    const starsenderToken = process.env.STARSENDER_TOKEN
    const phoneNumber = orderDetail.customer?.phone_number

    if (!starsenderUrl || !starsenderToken || !phoneNumber) {
      console.error("❌ Data WhatsApp tidak lengkap:", { starsenderUrl: !!starsenderUrl, starsenderToken: !!starsenderToken, phoneNumber })
      return
    }

    const starsenderRes = await fetch(starsenderUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: starsenderToken,
      },
      body: JSON.stringify({
        messageType: "text",
        to: phoneNumber,
        body: messageBody,
      }),
    })

    const starsenderJson = await starsenderRes.json().catch(() => ({}))
    const status = starsenderRes.ok ? "success" : "failed"

    if (starsenderRes.ok) {
      console.log("✅ WhatsApp paid terkirim ke:", phoneNumber)
    } else {
      console.error("❌ WhatsApp paid gagal terkirim:", starsenderJson)
    }

    // 6. Insert ke notification_logs
    try {
      await sql`
        INSERT INTO notification_logs (
          order_reference, channel, trigger_on, recipient_phone, 
          request_payload, response_payload, created_at
        ) VALUES (
          ${orderReference}, 'whatsapp', 'paid', ${phoneNumber},
          ${JSON.stringify({ message: messageBody })}, ${JSON.stringify(starsenderJson)},
          ${new Date().toISOString()}
        )
      `
    } catch (notifLogError) {
      console.error("❌ Gagal insert ke notification_logs:", notifLogError, {
        order_reference: orderReference,
        channel: "whatsapp",
        trigger_on: "paid",
        recipient_phone: phoneNumber,
        request_payload: { message: messageBody },
        response_payload: starsenderJson,
      })
    }
  } catch (error) {
    console.error("❌ Gagal kirim WhatsApp paid:", error)
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Faspay webhook endpoint is active",
    timestamp: new Date().toISOString(),
  })
}
