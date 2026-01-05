import { getEventBySlug, getPaymentChannels } from "@/lib/data"
import { CheckoutForm } from "@/components/checkout-form"
import { notFound } from "next/navigation"

// Revalidate every 10 minutes for checkout pages
export const revalidate = 600

interface CheckoutPageProps {
  searchParams: {
    event?: string
    tickets?: string
  }
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  if (!searchParams.event || !searchParams.tickets) {
    notFound()
  }

  const event = await getEventBySlug(searchParams.event)
  const paymentChannels = await getPaymentChannels()

  if (!event) {
    notFound()
  }

  let selectedTickets
  try {
    selectedTickets = JSON.parse(searchParams.tickets)
  } catch {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        <CheckoutForm event={event} selectedTickets={selectedTickets} paymentChannels={paymentChannels} />
      </div>
    </div>
  )
}
