"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Minus, Plus } from "lucide-react"

interface TicketSelectionProps {
  event: any
}

export function TicketSelection({ event }: TicketSelectionProps) {
  const [selectedTickets, setSelectedTickets] = useState<Record<number, number>>({})

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const updateTicketQuantity = (ticketTypeId: number, quantity: number) => {
    setSelectedTickets((prev) => ({
      ...prev,
      [ticketTypeId]: Math.max(0, quantity),
    }))
  }

  const resetTickets = () => {
    setSelectedTickets({})
  }

  const getTotalPrice = () => {
    return Object.entries(selectedTickets).reduce((total, [ticketTypeId, quantity]) => {
      const ticketType = event.ticket_types.find((tt: any) => tt.id === Number.parseInt(ticketTypeId))
      return total + (ticketType ? ticketType.price * quantity : 0)
    }, 0)
  }

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((total, quantity) => total + quantity, 0)
  }

  const handleCheckout = () => {
    const selectedItems = Object.entries(selectedTickets)
      .filter(([_, quantity]) => quantity > 0)
      .map(([ticketTypeId, quantity]) => ({
        ticketTypeId: Number.parseInt(ticketTypeId),
        quantity,
      }))

    if (selectedItems.length === 0) {
      alert("Pilih minimal 1 tiket")
      return
    }

    // Redirect to checkout page with selected tickets
    const params = new URLSearchParams()
    params.set("event", event.slug)
    params.set("tickets", JSON.stringify(selectedItems))

    window.location.href = `/checkout?${params.toString()}`
  }

  if (!event.ticket_types || event.ticket_types.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Belum ada tiket tersedia untuk event ini</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Pilih Tiket</h3>

      {/* Ticket Options */}
      {event.ticket_types.map((ticketType: any) => {
        const availableTickets = ticketType.quantity_total - ticketType.quantity_sold
        const selectedQuantity = selectedTickets[ticketType.id] || 0
        // Tidak ada pembatasan, tickets_per_purchase hanya penanda
        const maxQuantity = availableTickets
        const isSelected = selectedQuantity > 0

        return (
          <Card
            key={ticketType.id}
            className={`border-2 transition-colors ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} hover:border-blue-400`}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{ticketType.name}</h4>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{formatPrice(ticketType.price)}</p>
                  <p className="text-xs text-gray-500 mt-1">Dapat {ticketType.tickets_per_purchase} tiket per pembelian</p>
                </div>
                <div className="text-right">
                  {availableTickets > 0 ? (
                    <Badge variant="secondary">Tersisa: {availableTickets}</Badge>
                  ) : (
                    <Badge variant="destructive">Sold Out</Badge>
                  )}
                </div>
              </div>

              {availableTickets > 0 ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTicketQuantity(ticketType.id, selectedQuantity - 1)}
                      disabled={selectedQuantity === 0}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{selectedQuantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTicketQuantity(ticketType.id, selectedQuantity + 1)}
                      disabled={selectedQuantity >= maxQuantity}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">Max: {availableTickets} per pembelian</p>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-gray-500">Tiket sudah habis</p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Tombol Reset Pilihan */}
      {Object.values(selectedTickets).some(q => q > 0) && (
        <Button variant="outline" className="w-full" onClick={resetTickets}>
          Reset Pilihan Tiket
        </Button>
      )}

      {/* Checkout Summary */}
      {getTotalTickets() > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium">Total: {getTotalTickets()} tiket</span>
              <span className="text-xl font-bold text-blue-600">{formatPrice(getTotalPrice())}</span>
            </div>
            <Button onClick={handleCheckout} className="w-full" size="lg">
              Lanjut ke Pembayaran
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
