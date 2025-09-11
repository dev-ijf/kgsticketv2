import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/neon"
import { getOrderWithDetails } from "@/lib/data"
// import { sendEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderReference, type } = body
    if (!orderReference || !type) {
      return NextResponse.json({ error: "Missing orderReference or type" }, { status: 400 })
    }

    // Tentukan template id dan trigger_on sesuai type
    let templateId = 2
    let triggerOn = "checkout"
    if (type === "whatsapp" && body.action === "send_notification" && body.paid) {
      templateId = 4
      triggerOn = "paid"
    } else if (type === "whatsapp") {
      templateId = 2
      triggerOn = "checkout"
    } else if (type === "email" && body.action === "send_notification" && body.paid) {
      templateId = 4
      triggerOn = "paid"
    } else if (type === "email") {
      templateId = 2
      triggerOn = "checkout"
    }

    // 1. Ambil template WhatsApp
    const notifTemplateResult = await sql`
      SELECT body FROM notification_templates 
      WHERE id = ${templateId} 
      AND channel = 'whatsapp' 
      AND trigger_on = ${triggerOn}
      LIMIT 1
    `
    const notifTemplate = notifTemplateResult[0]

    // 1b. Ambil template email
    const emailTemplateResult = await sql`
      SELECT body, subject FROM notification_templates 
      WHERE id = ${templateId} 
      AND channel = 'email' 
      AND trigger_on = ${triggerOn}
      LIMIT 1
    `
    const emailTemplate = emailTemplateResult[0]

    if ((type === "whatsapp" && !notifTemplate) || (type === "email" && !emailTemplate)) {
      console.error("❌ Gagal ambil template")
      return NextResponse.json({ error: "Gagal ambil template notifikasi" }, { status: 500 })
    }

    // 2. Ambil data order lengkap
    const orderDetail = await getOrderWithDetails(orderReference)
    if (!orderDetail) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 })
    }

    // 3. Siapkan data untuk placeholder
    function formatRupiah(amount: number | string): string {
      const num = typeof amount === "number" ? amount : Number(amount)
      return isNaN(num) ? "-" : `Rp ${num.toLocaleString("id-ID")}`
    }
    function formatDeadline(dateStr: string | null): string {
      if (!dateStr) return "-"
      const date = new Date(new Date(dateStr).getTime() + 5 * 60 * 60 * 1000)
      const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
      const bulan = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
      ]
      const hariStr = hari[date.getDay()]
      const tgl = date.getDate()
      const bln = bulan[date.getMonth()]
      const thn = date.getFullYear()
      const jam = date.toLocaleTimeString("id-ID", { hour12: false, timeZone: "Asia/Jakarta" })
      return `${hariStr}, ${tgl} ${bln} ${thn} jam ${jam} WIB`
    }

    let placeholderData: Record<string, string> = {
      "customer.name": orderDetail.customer?.name || "-",
      "order.order_reference": orderDetail.order_reference || "-",
      "event.name": orderDetail.event?.name || "-",
      ticket_link: `${process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || ""}/payment/${orderReference}`,
    }
    if (triggerOn === "checkout") {
      placeholderData = {
        ...placeholderData,
        "order.final_amount": formatRupiah(orderDetail.final_amount),
        payment_deadline: formatDeadline(orderDetail.created_at || null),
        "payment_channel.pg_name": orderDetail.payment_channel?.pg_name || "-",
        virtual_account_number: orderDetail.virtual_account_number || "-",
        payment_response_url: orderDetail.payment_response_url || "-",
      }
    }

    // 4. Fungsi replace placeholder
    function fillTemplate(template: string, data: Record<string, string>): string {
      let result = template
      for (const key in data) {
        result = result.replace(new RegExp(`{{${key}}}`, "g"), data[key])
      }
      return result
    }
    const messageBody = notifTemplate ? fillTemplate(notifTemplate.body, placeholderData) : ""
    const emailBody = emailTemplate ? fillTemplate(emailTemplate.body, placeholderData) : ""
    const emailSubject = emailTemplate ? fillTemplate(emailTemplate.subject || "", placeholderData) : ""

    // 5. Kirim WhatsApp via fetch ke Starsender (jika type whatsapp atau all)
    let starsenderRes = null
    let starsenderJson = null
    let waStatus = "failed"
    const phoneNumber = orderDetail.customer?.phone_number
    if (
      (type === "whatsapp" || type === "all") &&
      process.env.STARSENDER_URL &&
      process.env.STARSENDER_TOKEN &&
      phoneNumber
    ) {
      try {
        starsenderRes = await fetch(process.env.STARSENDER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: process.env.STARSENDER_TOKEN,
          },
          body: JSON.stringify({
            messageType: "text",
            to: phoneNumber,
            body: messageBody,
          }),
        })
        starsenderJson = await starsenderRes.json().catch(() => ({}))
        waStatus = starsenderRes.ok ? "success" : "failed"
        if (starsenderRes.ok) {
          console.log("✅ WhatsApp terkirim ke:", phoneNumber)
        } else {
          console.error("❌ WhatsApp gagal terkirim:", starsenderJson)
        }
      } catch (err) {
        console.error("❌ Error kirim WhatsApp:", err)
      }
    }
    // 6. Kirim email jika type email atau all
    const emailResult = null
    const emailStatus = "disabled" // Temporarily disabled
    if ((type === "email" || type === "all") && orderDetail.customer?.email && emailBody && emailSubject) {
      console.log("📧 Email functionality temporarily disabled for deployment")
      // Temporarily commented out email sending
      // try {
      //   emailResult = await sendEmail({
      //     to: orderDetail.customer.email,
      //     subject: emailSubject,
      //     html: emailBody,
      //   })
      //   if (emailResult && emailResult.data && emailResult.data.id) {
      //     emailStatus = "success"
      //     console.log("✅ Email terkirim ke:", orderDetail.customer.email)
      //   } else {
      //     emailStatus = "failed"
      //     console.error("❌ Email gagal terkirim:", emailResult?.error)
      //   }
      // } catch (err) {
      //   emailStatus = "failed"
      //   console.error("❌ Error kirim email:", err)
      // }
    }

    // 7. Insert ke notification_logs untuk WhatsApp
    if (type === "whatsapp" || type === "all") {
      try {
        await sql`
          INSERT INTO notification_logs (
            order_reference, channel, trigger_on, recipient_phone, 
            request_payload, response_payload, created_at
          ) VALUES (
            ${orderReference}, 'whatsapp', ${triggerOn}, ${phoneNumber},
            ${JSON.stringify({ message: messageBody })}, ${JSON.stringify(starsenderJson)},
            ${new Date().toISOString()}
          )
        `
      } catch (notifLogError) {
        console.error("❌ Gagal insert ke notification_logs (WA):", notifLogError)
      }
    }
    // 8. Insert ke notification_logs untuk email
    if ((type === "email" || type === "all") && orderDetail.customer?.email) {
      try {
        await sql`
          INSERT INTO notification_logs (
            order_reference, channel, trigger_on, recipient_email, 
            request_payload, response_payload, created_at
          ) VALUES (
            ${orderReference}, 'email', ${triggerOn}, ${orderDetail.customer.email},
            ${JSON.stringify({ subject: emailSubject, html: emailBody })}, ${JSON.stringify(emailResult)},
            ${new Date().toISOString()}
          )
        `
      } catch (notifLogError) {
        console.error("❌ Gagal insert ke notification_logs (email):", notifLogError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ Gagal kirim notifikasi endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
