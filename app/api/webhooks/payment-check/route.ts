import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderReference, action } = body

    console.log("Payment check webhook received:", {
      orderReference,
      action,
      timestamp: new Date().toISOString(),
    })

    if (action === "check_payment_status") {
      // Here you would typically:
      // 1. Check order status in database
      // 2. Update expired orders
      // 3. Send notifications if needed

      console.log(`Checking payment status for order: ${orderReference}`)

      return NextResponse.json({
        success: true,
        message: "Payment status checked",
        orderReference,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed",
    })
  } catch (error) {
    console.error("Payment check webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Payment check webhook endpoint is active",
    timestamp: new Date().toISOString(),
  })
}
