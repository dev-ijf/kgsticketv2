import { MapPin, Calendar, Users, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Image from "next/image"
import { getEventBySlug, getPaymentChannels } from "@/lib/data"
import { notFound } from "next/navigation"
import { TicketCheckout } from "@/components/ticket-checkout"
import type { Metadata } from "next"
import { ShareEventButton } from "@/components/share-event-button"

// Revalidate every 15 minutes for better performance
export const revalidate = 900

interface EventPageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const event = await getEventBySlug(params.slug)

  if (!event) {
    return {
      title: "Event Not Found",
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://event.kreativaglobal.id"

  return {
    title: `${event.name} - Kreativa Global Event`,
    description:
      event.description?.replace(/<[^>]*>/g, "").substring(0, 160) || `Join ${event.name} at ${event.location}`,
    openGraph: {
      title: event.name,
      description:
        event.description?.replace(/<[^>]*>/g, "").substring(0, 160) || `Join ${event.name} at ${event.location}`,
      images: [
        {
          url: event.image_url || `${baseUrl}/images/logo-kgs.png`,
          width: 1200,
          height: 630,
          alt: event.name,
        },
      ],
      url: `${baseUrl}/event/${event.slug}`,
      siteName: "Kreativa Global Event",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: event.name,
      description:
        event.description?.replace(/<[^>]*>/g, "").substring(0, 160) || `Join ${event.name} at ${event.location}`,
      images: [event.image_url || `${baseUrl}/images/logo-kgs.png`],
    },
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const event = await getEventBySlug(params.slug)

  if (!event) {
    notFound()
  }

  const paymentChannels = await getPaymentChannels()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const formatTime = (startDate: string, endDate?: string) => {
    const start = new Date(startDate)
    const startTime = start.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

    if (endDate) {
      const end = new Date(endDate)
      const endTime = end.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      return `${startTime} - ${endTime} WIB`
    }

    return `${startTime} WIB`
  }

  return (
    <div className="bg-white min-h-screen w-full">
      <div className="w-full sm:max-w-4xl sm:mx-auto">
        <Card className="overflow-hidden shadow-none border-none w-full rounded-none bg-white">
          <div className="relative w-full aspect-[16/9] bg-white">
            <Image
              src={event.image_url || "/placeholder.svg?height=400&width=800&text=Event"}
              alt={event.name}
              fill
              className="object-contain object-center w-full h-full"
              style={{objectPosition: 'center top'}}
              priority
            />
            <div className="absolute top-4 right-4 z-10">
              <ShareEventButton eventName={event.name} />
            </div>
          </div>
          <CardContent className="pt-0 pb-2 px-4 sm:pt-0 sm:pb-4 sm:px-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
              {event.name}
            </h1>
            {/* Event Details - Mobile Stack */}
            <div className="space-y-3 mb-4 sm:mb-6">
              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-sm sm:text-base leading-relaxed">{event.location}</span>
                </div>
              )}
              {event.start_date && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="text-gray-700 text-sm sm:text-base">
                    <div className="font-medium">{formatDate(event.start_date)}</div>
                    <div className="text-gray-600">{formatTime(event.start_date, event.end_date)}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Event
                  </Badge>
                  {event.ticket_types && event.ticket_types.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {event.ticket_types.length} Tipe Tiket
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Mobile First */}
      <div className="px-4 sm:px-6 lg:px-8 -mt-0 relative z-10">
        <div className="w-full sm:max-w-4xl sm:mx-auto">
          {/* Gabungkan tab menjadi satu frame: Deskripsi di atas, Tiket di bawah, hapus S&K */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="prose max-w-none prose-sm sm:prose-base mb-8">
                <div
                  className="text-gray-700 leading-relaxed text-sm sm:text-base"
                  dangerouslySetInnerHTML={{
                    __html: event.description || "Deskripsi event akan segera tersedia.",
                  }}
                />
              </div>
              <TicketCheckout event={event} paymentChannels={paymentChannels} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
