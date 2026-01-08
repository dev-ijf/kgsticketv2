import { getEvents } from "@/lib/data"
import EventGridWithLoading from "@/components/event-grid-with-loading"

// Revalidate every 15 minutes for better performance
export const revalidate = 900

export default async function HomePage() {
  const events = await getEvents()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      {/* Events Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
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
