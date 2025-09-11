import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar } from "lucide-react"
import Image from "next/image"
import { getEvents } from "@/lib/data"
import EventGridWithLoading from "@/components/event-grid-with-loading"

export default async function HomePage() {
  const events = await getEvents()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      {/* Events Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Event Populer</h2>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Belum ada event tersedia</p>
            </div>
          ) : (
            <EventGridWithLoading events={events} />
          )}
        </div>
      </section>
    </div>
  )
}
