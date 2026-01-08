import { type NextRequest, NextResponse } from "next/server"
import { createCustomer, createOrder, createOrderItems, createPaymentLog, createOrderItemAttendees } from "@/lib/data"
import { generateBillNo } from "@/lib/faspay-utils"
import { createFaspayPayment } from "@/lib/faspay-service"
import { sql } from "@/lib/neon"

export async function POST(request: NextRequest) {
  let orderReference = ""
  let orderId = null

  try {
    const body = await request.json()
    const {
      eventId,
      customerName,
      customerEmail,
      customerPhone,
      paymentChannelCode,
      selectedTickets,
      attendeeData,
      voucherCode,
      grossAmount,
      discountAmount,
      finalAmount,
    } = body

    console.log("=== STEP 1: RECEIVED REQUEST ===")
    console.log("Request body:", JSON.stringify(body, null, 2))

    // Validate required fields
    if (!eventId || !customerName || !customerEmail || !paymentChannelCode || !finalAmount) {
      console.error("❌ Missing required fields")
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Generate order reference first
    orderReference = generateBillNo()
    console.log("=== STEP 2: GENERATED ORDER REFERENCE ===")
    console.log("Order reference:", orderReference)

    // Create or get customer
    console.log("=== STEP 3: CREATING/FINDING CUSTOMER ===")
    const customer = await createCustomer({
      name: customerName,
      email: customerEmail,
      phone_number: customerPhone,
    })
    console.log("✅ Customer:", {
      id: customer.id,
      name: customer.name,
      email: customer.email,
    })

    // Get payment channel
    console.log("=== STEP 4: GETTING PAYMENT CHANNEL ===")
    console.log("Looking for payment channel with pg_code:", paymentChannelCode)

    const paymentChannelResult = await sql`
      SELECT * FROM payment_channels 
      WHERE pg_code = ${paymentChannelCode}
    `

    if (paymentChannelResult.length === 0) {
      console.error("❌ Payment channel not found:", paymentChannelCode)
      return NextResponse.json(
        {
          success: false,
          error: "Payment channel not found",
        },
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }

    const paymentChannel = paymentChannelResult[0]
    console.log("✅ Payment channel found:", {
      id: paymentChannel.id,
      pg_name: paymentChannel.pg_name,
      pg_code: paymentChannel.pg_code,
    })

    // Get discount if voucher is applied
    let discountId = null
    if (voucherCode) {
      console.log("=== STEP 5: PROCESSING VOUCHER ===")
      console.log("Voucher code:", voucherCode)

      const discountResult = await sql`
        SELECT id FROM discounts 
        WHERE code = ${voucherCode}
      `

      if (discountResult.length > 0) {
        discountId = discountResult[0].id
        console.log("✅ Discount found:", discountId)
      } else {
        console.log("❌ Discount not found")
      }
    }

    // Create order FIRST
    console.log("=== STEP 6: CREATING ORDER IN DATABASE ===")
    const orderData = {
      order_reference: orderReference,
      customer_id: customer.id,
      event_id: eventId,
      payment_channel_id: paymentChannel.id,
      discount_id: discountId,
      gross_amount: grossAmount,
      discount_amount: discountAmount || 0,
      final_amount: finalAmount,
      status: "pending",
    }
    console.log("Order data to insert:", JSON.stringify(orderData, null, 2))

    const order = await createOrder(orderData)
    orderId = order.id
    console.log("✅ ORDER CREATED SUCCESSFULLY:")
    console.log("Order ID:", order.id)
    console.log("Order Reference:", orderReference)
    console.log("Order Status:", order.status)

    // Get event data for ticket types
    console.log("=== STEP 6.1: GETTING EVENT DATA ===")
    const eventResult = await sql`
      SELECT 
        e.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', tt.id,
              'name', tt.name,
              'price', tt.price,
              'quantity_total', tt.quantity_total,
              'quantity_sold', tt.quantity_sold,
              'tickets_per_purchase', tt.tickets_per_purchase
            )
          ) FILTER (WHERE tt.id IS NOT NULL),
          '[]'::json
        ) as ticket_types
      FROM events e
      LEFT JOIN ticket_types tt ON e.id = tt.event_id
      WHERE e.id = ${eventId}
      GROUP BY e.id
    `
    
    const event = eventResult[0]
    if (!event) {
      console.error("❌ Event not found:", eventId)
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
        },
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Create order items
    console.log("=== STEP 7: CREATING ORDER ITEMS ===")
    console.log("Selected tickets:", JSON.stringify(selectedTickets, null, 2))
    console.log("Attendee data received:", attendeeData ? `${attendeeData.length} items` : "null/undefined")
    if (attendeeData && attendeeData.length > 0) {
      console.log("Attendee data details:", JSON.stringify(attendeeData, null, 2))
    }

    const orderItemsData = []
    for (const item of selectedTickets) {
      console.log("Processing ticket item:", item)

      const ticketTypeResult = await sql`
        SELECT * FROM ticket_types 
        WHERE id = ${item.ticketTypeId}
      `

      if (ticketTypeResult.length > 0) {
        const ticketType = ticketTypeResult[0]
        // Calculate effective_ticket_count: quantity * tickets_per_purchase
        const effectiveTicketCount = item.quantity * (ticketType.tickets_per_purchase || 1)
        
        const orderItem = {
          order_id: order.id,
          ticket_type_id: item.ticketTypeId,
          quantity: item.quantity,
          price_per_ticket: ticketType.price,
          effective_ticket_count: effectiveTicketCount,
        }
        orderItemsData.push(orderItem)
        console.log("Added order item:", {
          ...orderItem,
          tickets_per_purchase: ticketType.tickets_per_purchase
        })
      }
    }

    if (orderItemsData.length > 0) {
      const createdOrderItems = await createOrderItems(orderItemsData)
      console.log("✅ Order items created:", createdOrderItems.length)
      console.log("Created order items details:", JSON.stringify(createdOrderItems, null, 2))

      // ALWAYS create attendee data - use customer data as default if attendeeData not provided
      console.log("=== STEP 7.1: CREATING ATTENDEE DATA ===")
      console.log("Created order items:", JSON.stringify(createdOrderItems, null, 2))
      console.log("Event ticket types:", JSON.stringify(event.ticket_types, null, 2))
      console.log("Attendee data received:", attendeeData ? `${attendeeData.length} items` : "null/undefined")
      
      const attendeesToCreate = []
      let attendeeDataIndex = 0 // Track position in attendeeData array
      
      for (let i = 0; i < createdOrderItems.length; i++) {
        const orderItem = createdOrderItems[i]
        console.log(`\n--- Processing order item ${i} ---`)
        console.log("Order item:", JSON.stringify(orderItem, null, 2))
        
        // Try to find ticket type from event data first
        let ticketType = event.ticket_types?.find((tt: any) => tt.id === orderItem.ticket_type_id)
        
        // If not found, fetch from database
        if (!ticketType) {
          console.log(`Ticket type not found in event data, fetching from database for ticket_type_id=${orderItem.ticket_type_id}`)
          const ticketTypeResult = await sql`
            SELECT * FROM ticket_types WHERE id = ${orderItem.ticket_type_id}
          `
          if (ticketTypeResult.length > 0) {
            ticketType = ticketTypeResult[0]
            console.log("Fetched ticket type from database:", JSON.stringify(ticketType, null, 2))
          }
        }
        
        // Calculate how many attendees for this order item
        // Priority: effective_ticket_count > quantity * tickets_per_purchase > quantity > 1
        let attendeesPerItem = 1
        
        // Try to get effective_ticket_count first (should be set when creating order item)
        if (orderItem.effective_ticket_count != null && orderItem.effective_ticket_count > 0) {
          attendeesPerItem = Number(orderItem.effective_ticket_count)
          console.log(`Using effective_ticket_count: ${attendeesPerItem}`)
        } else if (orderItem.quantity != null && orderItem.quantity > 0) {
          // Fallback: calculate from quantity * tickets_per_purchase
          const ticketsPerPurchase = ticketType?.tickets_per_purchase ? Number(ticketType.tickets_per_purchase) : 1
          const quantity = Number(orderItem.quantity)
          attendeesPerItem = quantity * ticketsPerPurchase
          console.log(`Calculated from quantity * tickets_per_purchase: ${quantity} * ${ticketsPerPurchase} = ${attendeesPerItem}`)
        } else {
          // Last resort: use 1
          console.warn(`⚠️ Could not determine attendeesPerItem, using default: 1`)
          attendeesPerItem = 1
        }
        
        // Ensure at least 1 attendee (safety check)
        if (attendeesPerItem <= 0 || isNaN(attendeesPerItem)) {
          console.warn(`⚠️ Invalid attendeesPerItem (${attendeesPerItem}), using 1 as default`)
          attendeesPerItem = 1
        }
        
        console.log(`Final attendeesPerItem: ${attendeesPerItem} (effective_ticket_count=${orderItem.effective_ticket_count}, quantity=${orderItem.quantity}, tickets_per_purchase=${ticketType?.tickets_per_purchase || 1})`)
        
        for (let j = 0; j < attendeesPerItem; j++) {
          let attendee: any = null
          
          // Try to get attendee data from attendeeData array
          if (attendeeData && attendeeData.length > 0 && attendeeDataIndex < attendeeData.length) {
            attendee = attendeeData[attendeeDataIndex]
            console.log(`Using attendee data from array [${attendeeDataIndex}]:`, {
              name: attendee.name,
              email: attendee.email,
              phone: attendee.phone,
              hasCustomAnswers: !!attendee.customAnswers
            })
            attendeeDataIndex++
          } else {
            // Use customer data as default if no attendee data provided
            console.log(`Using customer data as default for attendee ${j + 1} of order item ${i}`)
            attendee = {
              name: customerName,
              email: customerEmail,
              phone: customerPhone,
              customAnswers: {}
            }
          }
          
          if (attendee) {
            const attendeeToCreate = {
              order_item_id: orderItem.id,
              attendee_name: attendee.name || customerName,
              attendee_email: attendee.email || customerEmail,
              attendee_phone_number: attendee.phone || customerPhone,
              custom_answers: attendee.customAnswers || {},
              barcode_id: attendee.barcodeId || null
            }
            attendeesToCreate.push(attendeeToCreate)
            console.log(`Added attendee ${j + 1}/${attendeesPerItem} to create list:`, {
              order_item_id: attendeeToCreate.order_item_id,
              name: attendeeToCreate.attendee_name
            })
          } else {
            // Fallback: create attendee with customer data if attendee is null
            console.warn(`⚠️ Attendee is null for order item ${i}, attendee ${j + 1}, using customer data as fallback`)
            const attendeeToCreate = {
              order_item_id: orderItem.id,
              attendee_name: customerName,
              attendee_email: customerEmail,
              attendee_phone_number: customerPhone,
              custom_answers: {},
              barcode_id: null
            }
            attendeesToCreate.push(attendeeToCreate)
            console.log(`Added fallback attendee ${j + 1}/${attendeesPerItem} to create list`)
          }
        }
        
        // Safety check: ensure at least 1 attendee was created for this order item
        const attendeesForThisItem = attendeesToCreate.filter(a => a.order_item_id === orderItem.id)
        if (attendeesForThisItem.length === 0) {
          console.error(`❌ CRITICAL: No attendees created for order item ${i} (ticket_type_id=${orderItem.ticket_type_id})`)
          // Force create at least 1 attendee with customer data
          attendeesToCreate.push({
            order_item_id: orderItem.id,
            attendee_name: customerName,
            attendee_email: customerEmail,
            attendee_phone_number: customerPhone,
            custom_answers: {},
            barcode_id: null
          })
          console.log(`✅ Created fallback attendee for order item ${i}`)
        }
      }
      
      console.log(`\n=== SUMMARY ===`)
      console.log(`Total order items processed: ${createdOrderItems.length}`)
      console.log(`Total attendees to create: ${attendeesToCreate.length}`)
      console.log(`Attendee data provided: ${attendeeData ? attendeeData.length : 0} items`)
      
      if (attendeesToCreate.length > 0) {
        console.log(`\nCreating ${attendeesToCreate.length} attendees...`)
        console.log("Attendees to create sample:", JSON.stringify(attendeesToCreate.slice(0, 2), null, 2))
        
        try {
          const createdAttendees = await createOrderItemAttendees(attendeesToCreate)
          console.log("✅ Attendee data created successfully:", createdAttendees.length)
          if (createdAttendees.length > 0) {
            console.log("Created attendees sample:", JSON.stringify(createdAttendees.slice(0, 2), null, 2))
          }
        } catch (attendeeError) {
          console.error("❌ Error creating attendees:", attendeeError)
          throw attendeeError
        }
      } else {
        console.error("❌ CRITICAL: No attendees to create - attendeesToCreate array is empty")
        console.error("Debug info:", {
          createdOrderItemsCount: createdOrderItems.length,
          attendeeDataCount: attendeeData ? attendeeData.length : 0,
          createdOrderItems: JSON.stringify(createdOrderItems, null, 2)
        })
        throw new Error("Failed to create attendees: attendeesToCreate array is empty")
      }
    } else {
      console.error("❌ CRITICAL: No order items to create")
      throw new Error("No order items created")
    }

    // Update discount usage count if voucher was used
    if (discountId) {
      console.log("=== STEP 8: UPDATING DISCOUNT USAGE ===")
      try {
        await sql`
          UPDATE discounts 
          SET usage_count = usage_count + 1 
          WHERE id = ${discountId}
        `
        console.log("✅ Discount usage updated")
      } catch (discountError) {
        console.error("❌ Failed to increment discount usage:", discountError)
      }
    }

    // Cek jika bank_transfer, handle tanpa Faspay
    let virtualAccountNumber = null
    let redirectUrl = null
    let uniqueCode = null
    const isManualPayment = paymentChannel.category === "bank_transfer" || paymentChannel.category === "qris_statis"

    if (isManualPayment) {
      // Generate kode unik 3 digit, pastikan unik per rekening/channel per hari
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startOfDay = today.toISOString()
      today.setHours(23, 59, 59, 999)
      const endOfDay = today.toISOString()
      let found = false
      let tryCount = 0
      while (!found && tryCount < 20) {
        uniqueCode = Math.floor(100 + Math.random() * 900) // 3 digit
        const existingOrderResult = await sql`
          SELECT id FROM orders
          WHERE virtual_account_number = ${paymentChannel.pg_code}
            AND unique_code = ${uniqueCode}
            AND created_at >= ${startOfDay}
            AND created_at <= ${endOfDay}
        `
        if (existingOrderResult.length === 0) {
          found = true
        }
        tryCount++
      }
      if (!found) {
        // fallback, pakai random saja
        uniqueCode = Math.floor(100 + Math.random() * 900)
      }
      const totalWithUnique = finalAmount + uniqueCode
      virtualAccountNumber = paymentChannel.pg_code // nomor rekening atau identifier qris
      // Set payment_response_url
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      const paymentResponseUrl = `${baseUrl}/payment/${orderReference}`
      await sql`
        UPDATE orders 
        SET virtual_account_number = ${paymentChannel.pg_code},
            unique_code = ${uniqueCode},
            final_amount = ${totalWithUnique},
            payment_response_url = ${paymentResponseUrl}
        WHERE id = ${order.id}
      `
    } else {
      // === ALUR LAMA: FASPAY ===
      // Prepare Faspay request payload
      console.log("=== STEP 9: PREPARING FASPAY REQUEST ===")
      const faspayRequestData = {
        orderReference,
        customerName,
        customerEmail,
        paymentChannel: paymentChannelCode,
        finalAmount: finalAmount * 100, // dikali 100 sesuai kebutuhan Faspay
      }
      console.log("Faspay request data:", JSON.stringify(faspayRequestData, null, 2))

      // Create Faspay payment
      console.log("=== STEP 10: CALLING FASPAY API ===")
      const faspayResult = await createFaspayPayment(faspayRequestData)

      console.log("=== FASPAY RESPONSE RECEIVED ===")
      console.log("Faspay success:", faspayResult.success)
      console.log("Faspay HTTP status:", faspayResult.httpStatus)
      console.log("Faspay error:", faspayResult.error)
      console.log("Faspay request payload:", JSON.stringify(faspayResult.requestPayload, null, 2))
      console.log("Faspay response data:", JSON.stringify(faspayResult.data, null, 2))

      // Extract trx_id and redirect_url from Faspay response
      if (faspayResult.success && faspayResult.data && typeof faspayResult.data === "object") {
        console.log("=== STEP 11: EXTRACTING FASPAY DATA ===")
        virtualAccountNumber = faspayResult.data.trx_id
        redirectUrl = faspayResult.data.redirect_url
        console.log("Extracted trx_id:", virtualAccountNumber)
        console.log("Extracted redirect_url:", redirectUrl)
      } else {
        console.log("❌ Faspay failed or no data returned")
        console.log("Faspay error details:", faspayResult.error)
      }
      // For testing, generate a mock virtual account number if not provided
      if (!virtualAccountNumber) {
        virtualAccountNumber = `1260${orderReference.slice(-10)}`
        console.log("Generated mock virtual account:", virtualAccountNumber)
      }
      // Update order dengan VA dan redirectUrl jika ada
      const updateData: any = {}
      if (virtualAccountNumber) {
        updateData.virtual_account_number = virtualAccountNumber
      }
      if (redirectUrl) {
        updateData.payment_response_url = redirectUrl
      }
      if (Object.keys(updateData).length > 0) {
        try {
          if (virtualAccountNumber && redirectUrl) {
            await sql`
              UPDATE orders 
              SET virtual_account_number = ${virtualAccountNumber},
                  payment_response_url = ${redirectUrl}
              WHERE id = ${order.id}
            `
          } else if (virtualAccountNumber) {
            await sql`
              UPDATE orders 
              SET virtual_account_number = ${virtualAccountNumber}
              WHERE id = ${order.id}
            `
          } else if (redirectUrl) {
            await sql`
              UPDATE orders 
              SET payment_response_url = ${redirectUrl}
              WHERE id = ${order.id}
            `
          }
        } catch (updateError) {
          console.error("❌ Failed to update order:", updateError)
        }
      }
    }

    // Log payment request to payment_logs
    console.log("=== STEP 12: CREATING PAYMENT LOG ===")
    const paymentLogData = {
      order_reference: orderReference,
      log_type: "checkout",
      request_payload: null, // Faspay request payload is now handled above
      response_payload: null, // Faspay response payload is now handled above
      virtual_account_number: virtualAccountNumber,
    }
    console.log("Payment log data:", JSON.stringify(paymentLogData, null, 2))

    try {
      const paymentLog = await createPaymentLog(paymentLogData)
      console.log("✅ Payment log created:", paymentLog.id)
    } catch (logError) {
      console.error("❌ Failed to create payment log:", logError)
    }

    // === KIRIM WHATSAPP KE CUSTOMER ===
    if (paymentChannel.category === "ewallet") {
      console.log("Lewati WhatsApp checkout untuk ewallet")
    } else {
      try {
        const notifTemplateResult = await sql`
          SELECT body FROM notification_templates
          WHERE id = 2 
            AND channel = 'whatsapp' 
            AND trigger_on = 'checkout'
        `

        if (notifTemplateResult.length === 0) {
          console.error("❌ Gagal ambil template WhatsApp: Template tidak ditemukan")
          throw new Error("Template tidak ditemukan")
        }

        const notifTemplate = notifTemplateResult[0]

        // 2. Ambil data order lengkap
        const { getOrderWithDetails } = await import("@/lib/data")
        const orderDetail = await getOrderWithDetails(orderReference)
        if (!orderDetail) throw new Error("Gagal ambil detail order untuk WhatsApp")

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
        const paymentDeadline = formatDeadline(orderDetail.created_at || null)
        const placeholderData = {
          "customer.name": orderDetail.customer?.name || "-",
          "event.name": orderDetail.event?.name || "-",
          "order.order_reference": orderDetail.order_reference || "-",
          "order.final_amount": formatRupiah(orderDetail.final_amount),
          payment_deadline: paymentDeadline,
          "payment_channel.pg_name": orderDetail.payment_channel?.pg_name || "-",
          virtual_account_number: orderDetail.virtual_account_number || "-",
          payment_response_url: orderDetail.payment_response_url || "-",
        }
        function fillTemplate(template: string, data: Record<string, string>): string {
          let result = template
          for (const key in data) {
            result = result.replace(new RegExp(`{{${key}}}`, "g"), data[key])
          }
          return result
        }
        const messageBody = fillTemplate(notifTemplate.body, placeholderData)

        // 5. Kirim WhatsApp via fetch ke Starsender
        // Gunakan nomor dari inputan langsung, bukan dari database customer
        const starsenderUrl = process.env.STARSENDER_URL
        const starsenderToken = process.env.STARSENDER_TOKEN
        const phoneNumber = customerPhone
        let starsenderRes = null
        let starsenderJson = null
        let status = "failed"
        if (starsenderUrl && starsenderToken && phoneNumber) {
          starsenderRes = await fetch(starsenderUrl, {
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
          starsenderJson = await starsenderRes.json().catch(() => ({}))
          console.log("Response Starsender:", starsenderRes.status, starsenderJson)
          status = starsenderRes.ok ? "success" : "failed"
          if (starsenderRes.ok) {
            console.log("✅ WhatsApp checkout terkirim ke:", phoneNumber)
          } else {
            console.error("❌ WhatsApp gagal terkirim:", starsenderJson)
          }
        } else {
          console.error("❌ Data WhatsApp tidak lengkap:", { starsenderUrl, starsenderToken, phoneNumber })
        }
        // 6. Insert ke notification_logs
        try {
          await sql`
            INSERT INTO notification_logs (
              order_reference, channel, trigger_on, recipient_phone, 
              request_payload, response_payload, created_at
            ) VALUES (
              ${orderReference}, 'whatsapp', 'checkout', ${phoneNumber},
              ${JSON.stringify({ message: messageBody })}, ${JSON.stringify(starsenderJson)},
              ${new Date().toISOString()}
            )
          `
        } catch (notifLogError) {
          console.error("❌ Gagal insert ke notification_logs:", notifLogError, {
            order_reference: orderReference,
            channel: "whatsapp",
            trigger_on: "checkout",
            recipient_phone: phoneNumber,
            request_payload: { message: messageBody },
            response_payload: starsenderJson,
          })
        }
      } catch (waError) {
        console.error("❌ Gagal kirim WhatsApp checkout:", waError)
      }
    }
    // === END KIRIM WHATSAPP ===

    console.log("=== STEP 14: RETURNING SUCCESS RESPONSE ===")
    const responseData = {
      success: true,
      orderReference,
      orderId: order.id,
      virtualAccountNumber,
      redirectUrl,
      faspayResponse: null, // Faspay response is now handled above
      paymentSuccess: true, // Assuming success if we reach here
      faspayError: null,
    }
    console.log("Final response:", JSON.stringify(responseData, null, 2))

    return NextResponse.json(responseData, {
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("=== CRITICAL ERROR OCCURRED ===")
    console.error("Error:", error)
    console.error("Error message:", error instanceof Error ? error.message : "Unknown error")
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    console.error("Order Reference:", orderReference)
    console.error("Order ID:", orderId)

    // Log the error to payment_logs if we have an order reference
    if (orderReference) {
      try {
        await createPaymentLog({
          order_reference: orderReference,
          log_type: "error",
          request_payload: null,
          response_payload: {
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : "No stack trace",
            timestamp: new Date().toISOString(),
          },
          virtual_account_number: null,
        })
        console.log("✅ Error logged to payment_logs")
      } catch (logError) {
        console.error("❌ Failed to log error:", logError)
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create order",
        details: error instanceof Error ? error.message : "Unknown error",
        orderReference: orderReference || null,
        orderId: orderId || null,
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
