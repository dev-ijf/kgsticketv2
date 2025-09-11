import { sql } from "@/lib/neon"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle } from "lucide-react"

interface VerifyPageProps {
  params: {
    eventSlug: string
    ticketCode: string
  }
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { eventSlug, ticketCode } = params

  try {
    const ticketResult = await sql`
      SELECT 
        t.*,
        tt.name as ticket_type_name,
        tt.price as ticket_type_price,
        o.*,
        e.name as event_name,
        e.slug as event_slug,
        e.location as event_location,
        c.name as customer_name,
        c.email as customer_email
      FROM tickets t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      JOIN orders o ON t.order_id = o.id
      JOIN events e ON o.event_id = e.id
      JOIN customers c ON o.customer_id = c.id
      WHERE t.ticket_code = ${ticketCode}
    `

    if (ticketResult.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-600">Tiket Tidak Valid</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600">Kode tiket tidak ditemukan atau tidak valid.</p>
            </CardContent>
          </Card>
        </div>
      )
    }

    const ticket = ticketResult[0]

    // Check if ticket belongs to the correct event
    if (ticket.event_slug !== eventSlug) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-600">Event Tidak Sesuai</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600">Tiket ini tidak berlaku untuk event ini.</p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Tiket Valid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{ticket.event_name}</h3>
              <p className="text-gray-600">{ticket.event_location}</p>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Nama Peserta:</span>
                <span className="font-medium">{ticket.attendee_name}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Tipe Tiket:</span>
                <span className="font-medium">{ticket.ticket_type_name}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Kode Tiket:</span>
                <span className="font-mono text-sm">{ticket.ticket_code}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant={ticket.is_checked_in ? "default" : "secondary"}>
                  {ticket.is_checked_in ? "Sudah Check-in" : "Belum Check-in"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    console.error("Error fetching ticket:", error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Terjadi Kesalahan</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">Gagal memverifikasi tiket. Silakan coba lagi.</p>
          </CardContent>
        </Card>
      </div>
    )
  }
}
