"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface CheckoutFormProps {
  event: any
  selectedTickets: any[]
  paymentChannels: any[]
}

export function CheckoutForm({ event, selectedTickets, paymentChannels }: CheckoutFormProps) {
  // Local storage keys
  const LS_NAME_KEY = "checkout_customerName"
  const LS_EMAIL_KEY = "checkout_customerEmail"
  const LS_PHONE_KEY = "checkout_customerPhone"

  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [paymentChannel, setPaymentChannel] = useState("")

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem(LS_NAME_KEY)
      const savedEmail = localStorage.getItem(LS_EMAIL_KEY)
      const savedPhone = localStorage.getItem(LS_PHONE_KEY)
      console.log("[CheckoutForm] Ambil dari localStorage:", { savedName, savedEmail, savedPhone })
      if (savedName) setCustomerName(savedName)
      if (savedEmail) setCustomerEmail(savedEmail)
      if (savedPhone) setCustomerPhone(savedPhone)
    }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_NAME_KEY, customerName)
    }
  }, [customerName])
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_EMAIL_KEY, customerEmail)
    }
  }, [customerEmail])
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_PHONE_KEY, customerPhone)
    }
  }, [customerPhone])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const getTotalPrice = () => {
    return selectedTickets.reduce((total, item) => {
      const ticketType = event.ticket_types.find((tt: any) => tt.id === item.ticketTypeId)
      return total + (ticketType ? ticketType.price * item.quantity : 0)
    }, 0)
  }

  const handleSubmit = async () => {
    if (!customerName || !customerEmail || !customerPhone || !paymentChannel) {
      alert("Mohon lengkapi semua data")
      return
    }

    const orderData = {
      eventSlug: event.slug,
      customerName,
      customerEmail,
      customerPhone,
      paymentChannel,
      selectedTickets,
    }

    // Hapus data dari localStorage setelah checkout (opsional)
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_NAME_KEY)
      localStorage.removeItem(LS_EMAIL_KEY)
      localStorage.removeItem(LS_PHONE_KEY)
    }

    // Redirect to payment page
    const params = new URLSearchParams()
    params.set("orderData", JSON.stringify(orderData))
    window.location.href = `/payment?${params.toString()}`
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <h2 className="text-2xl font-semibold mb-4">Informasi</h2>

        <div>
          <Label htmlFor="name">Nama Lengkap</Label>
          <Input
            type="text"
            id="name"
            placeholder="Nama Lengkap"
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value)
              if (typeof window !== "undefined") localStorage.setItem(LS_NAME_KEY, e.target.value)
            }}
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            placeholder="Email"
            value={customerEmail}
            onChange={(e) => {
              setCustomerEmail(e.target.value)
              if (typeof window !== "undefined") localStorage.setItem(LS_EMAIL_KEY, e.target.value)
            }}
          />
        </div>

        <div>
          <Label htmlFor="phone">Nomor Telepon</Label>
          <Input
            type="tel"
            id="phone"
            placeholder="Nomor Telepon"
            value={customerPhone}
            onChange={(e) => {
              setCustomerPhone(e.target.value)
              if (typeof window !== "undefined") localStorage.setItem(LS_PHONE_KEY, e.target.value)
            }}
          />
        </div>

        <div>
          <Label>Metode Pembayaran</Label>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex-1 text-base text-gray-700">
              {paymentChannel
                ? paymentChannels.find((c: any) => c.code === paymentChannel)?.name || "Pilih Metode Pembayaran"
                : "Pilih Metode Pembayaran"}
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" className="bg-sky-400 hover:bg-sky-500 text-white font-bold rounded-full px-6 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2">
                  Pilih <span className="ml-1">▼</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-4">
                  <h4 className="font-semibold text-base mb-4">Pilih Metode Pembayaran</h4>
                  <RadioGroup value={paymentChannel} onValueChange={(val) => { setPaymentChannel(val); (document.activeElement as HTMLElement)?.blur(); }}>
                    <div className="space-y-2">
                      {paymentChannels.map((channel: any) => (
                        <label
                          key={channel.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${paymentChannel === channel.code ? 'border-2 border-sky-500 bg-sky-50' : 'hover:bg-gray-100'}`}
                          style={{ borderWidth: paymentChannel === channel.code ? 2 : 1 }}
                        >
                          <RadioGroupItem value={channel.code} id={channel.code} />
                          {channel.image_url && (
                            <img src={channel.image_url} alt={channel.name} width={32} height={24} className="object-contain" />
                          )}
                          <span className="text-sm">{channel.name}</span>
                        </label>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="font-medium">Total</span>
            <span className="text-xl font-bold">{formatPrice(getTotalPrice())}</span>
          </div>
          <Button className="w-full" onClick={handleSubmit}>
            Lanjutkan Pembayaran
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
