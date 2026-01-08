"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function EventGridWithLoading({ events }: { events: any[] }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const isEventEnded = (event: any) => {
    if (!event) return false

    const now = new Date()
    const endDate = event.end_date ? new Date(event.end_date) : event.start_date ? new Date(event.start_date) : null

    if (!endDate || Number.isNaN(endDate.getTime())) return false

    return endDate < now
  }

  const getLowestPrice = (ticketTypes: any[]) => {
    if (!ticketTypes || ticketTypes.length === 0) return 0
    return Math.min(...ticketTypes.map((tt) => tt.price))
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event: any) => (
        <Link key={event.id} href={`/event/${event.slug}`} className="cursor-pointer" prefetch={true}>
          <Card className="overflow-hidden hover:shadow-xl hover:-translate-y-2 transition-all duration-300 ease-in-out">
            <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
              <Image
                src={event.image_url || "/placeholder.svg?height=200&width=400&text=Event"}
                alt={event.name}
                fill
                className="object-contain hover:scale-105 transition-transform duration-300 ease-in-out"
              />
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">{event.name}</h3>
              <div className="space-y-2 text-sm text-gray-600 mb-3">
                {event.start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(event.start_date)}</span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Event</span>
                {isEventEnded(event) ? (
                  <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                    Berakhir
                  </Badge>
                ) : (
                  <Badge variant="secondary">Tersedia</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
