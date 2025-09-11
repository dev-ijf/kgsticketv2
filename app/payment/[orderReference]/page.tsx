import { getOrderWithDetails } from "@/lib/data"
import { notFound } from "next/navigation"
import PaymentPage from "@/components/payment-page"

interface PaymentPageProps {
  params: {
    orderReference: string
  }
}

export default async function Payment({ params }: PaymentPageProps) {
  const order = await getOrderWithDetails(params.orderReference)

  if (!order) {
    notFound()
  }

  // Ambil payment instructions
  let paymentInstructions = []
  try {
    if (order.payment_channel_id) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/payment-instructions/${order.payment_channel_id}`)
      const data = await res.json()
      paymentInstructions = data.instructions || []
    }
  } catch (e) {
    paymentInstructions = []
  }

  return <PaymentPage order={order} paymentInstructions={paymentInstructions} />
}
