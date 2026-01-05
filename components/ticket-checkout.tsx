"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Minus, Plus, CreditCard, Tag, Check, X, Loader2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog"
import { AttendeeForms } from "@/components/attendee-forms"

interface TicketCheckoutProps {
  event: any
  paymentChannels: any[]
}

// Local storage keys
const LS_NAME_KEY = "checkout_customerName"
const LS_EMAIL_KEY = "checkout_customerEmail"
const LS_PHONE_KEY = "checkout_customerPhone"

export function TicketCheckout({ event, paymentChannels }: TicketCheckoutProps) {
  const [selectedTickets, setSelectedTickets] = useState<Record<number, number>>({})
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [paymentChannel, setPaymentChannel] = useState("")
  const [isPaymentPopoverOpen, setIsPaymentPopoverOpen] = useState(false)
  const [voucherCode, setVoucherCode] = useState("")
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null)
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [voucherError, setVoucherError] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [attendeeData, setAttendeeData] = useState<any[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem(LS_NAME_KEY)
      const savedEmail = localStorage.getItem(LS_EMAIL_KEY)
      const savedPhone = localStorage.getItem(LS_PHONE_KEY)
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

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateAndFormatPhone = (phone: string) => {
    // Remove all non-digits
    const digitsOnly = phone.replace(/\D/g, "")

    // Check if it starts with 08, convert to 62
    if (digitsOnly.startsWith("08")) {
      return "62" + digitsOnly.substring(1)
    }

    // If it starts with 62, keep as is
    if (digitsOnly.startsWith("62")) {
      return digitsOnly
    }

    // If it starts with 8 (without 0), add 62
    if (digitsOnly.startsWith("8")) {
      return "62" + digitsOnly
    }

    return digitsOnly
  }

  const handleEmailChange = (email: string) => {
    setCustomerEmail(email)
    if (email && !validateEmail(email)) {
      setEmailError("Format email tidak valid")
    } else {
      setEmailError("")
    }
  }

  const handlePhoneChange = (phone: string) => {
    // Only allow digits
    const digitsOnly = phone.replace(/\D/g, "")
    setCustomerPhone(digitsOnly)

    if (digitsOnly && digitsOnly.length < 10) {
      setPhoneError("Nomor telepon minimal 10 digit")
    } else {
      setPhoneError("")
    }
  }

  const updateTicketQuantity = (ticketTypeId: number, quantity: number) => {
    setSelectedTickets((prev) => ({
      ...prev,
      [ticketTypeId]: Math.max(0, quantity),
    }))
  }

  const getGrossAmount = () => {
    return Object.entries(selectedTickets).reduce((total, [ticketTypeId, quantity]) => {
      const ticketType = event.ticket_types.find((tt: any) => tt.id === Number.parseInt(ticketTypeId))
      return total + (ticketType ? ticketType.price * quantity : 0)
    }, 0)
  }

  const getDiscountAmount = () => {
    if (!appliedVoucher) return 0

    const grossAmount = getGrossAmount()

    if (appliedVoucher.discount_type === "percentage") {
      const discount = (grossAmount * appliedVoucher.value) / 100
      return appliedVoucher.max_discount_amount ? Math.min(discount, appliedVoucher.max_discount_amount) : discount
    } else {
      return Math.min(appliedVoucher.value, grossAmount)
    }
  }

  const getFinalAmount = () => {
    return getGrossAmount() - getDiscountAmount()
  }

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((total, quantity) => total + quantity, 0)
  }

  const applyVoucher = async () => {
    if (!voucherCode.trim()) return

    setVoucherLoading(true)
    setVoucherError("")

    try {
      const response = await fetch("/api/vouchers/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: voucherCode,
          eventId: event.id,
          amount: getGrossAmount(),
        }),
      })

      const result = await response.json()

      if (result.success) {
        setAppliedVoucher(result.voucher)
        setVoucherError("")
      } else {
        setVoucherError(result.error || "Kode voucher tidak valid")
        setAppliedVoucher(null)
      }
    } catch (error) {
      setVoucherError("Terjadi kesalahan saat memvalidasi voucher")
      setAppliedVoucher(null)
    } finally {
      setVoucherLoading(false)
    }
  }

  const removeVoucher = () => {
    setAppliedVoucher(null)
    setVoucherCode("")
    setVoucherError("")
  }

  const handleCheckout = async () => {
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

    if (!customerName || !customerEmail || !customerPhone || !paymentChannel) {
      alert("Mohon lengkapi semua data")
      return
    }

    if (emailError || phoneError) {
      alert("Mohon perbaiki data yang tidak valid")
      return
    }

    if (!validateEmail(customerEmail)) {
      alert("Format email tidak valid")
      return
    }

    // Validate attendee data
    if (attendeeData.length > 0) {
      const invalidAttendees = attendeeData.filter(attendee => 
        !attendee.name || !attendee.email || !attendee.phone
      )
      
      if (invalidAttendees.length > 0) {
        alert("Mohon lengkapi data peserta yang masih kosong")
        return
      }
    }

    setIsProcessing(true)

    try {
      const formattedPhone = validateAndFormatPhone(customerPhone)

      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: event.id,
          customerName,
          customerEmail,
          customerPhone: formattedPhone,
          paymentChannelCode: paymentChannel,
          selectedTickets: selectedItems,
          attendeeData: attendeeData,
          voucherCode: appliedVoucher?.code,
          grossAmount: getGrossAmount(),
          discountAmount: getDiscountAmount(),
          finalAmount: getFinalAmount(),
        }),
      })

      // Check if response is ok first
      if (!response.ok) {
        console.error("Response not ok:", response.status, response.statusText)
        alert(`Server error: ${response.status} ${response.statusText}`)
        setIsProcessing(false)
        return
      }

      // Check content type
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Response is not JSON:", contentType)
        const responseText = await response.text()
        console.error("Response text:", responseText.substring(0, 200))
        alert("Server returned invalid response format")
        setIsProcessing(false)
        return
      }

      let result
      try {
        result = await response.json()
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError)
        const responseText = await response.text()
        console.error("Response text:", responseText.substring(0, 200))
        alert("Terjadi kesalahan dalam format response dari server")
        setIsProcessing(false)
        return
      }

      if (result.success) {
        // Add a small delay to show the spinner
        setTimeout(() => {
          window.location.href = `/payment/${result.orderReference}?loading=1`
        }, 1000)
      } else {
        alert(result.error || "Terjadi kesalahan")
        setIsProcessing(false)
      }
    } catch (error) {
      console.error("Checkout error:", error)
      alert("Terjadi kesalahan saat memproses pesanan")
      setIsProcessing(false)
    }
  }

  if (!event.ticket_types || event.ticket_types.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm sm:text-base">Belum ada tiket tersedia untuk event ini</p>
      </div>
    )
  }

  console.log('isPaymentPopoverOpen', isPaymentPopoverOpen)

  return (
    <>
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white bg-opacity-80">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
          <div className="text-lg font-semibold text-gray-700">Memproses pembayaran, mohon tunggu...</div>
        </div>
      )}
      <div className="space-y-4 sm:space-y-6">
        {/* Ticket Selection - Mobile Optimized */}
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-lg sm:text-xl font-semibold">Pilih Tiket</h3>
            {Object.values(selectedTickets).some(q => q > 0) && (
              <Button variant="outline" size="sm" onClick={() => setSelectedTickets({})}>
                Reset Pilihan Tiket
              </Button>
            )}
          </div>
          <div className="space-y-3 sm:space-y-4">
            {event.ticket_types.map((ticketType: any) => {
              const availableTickets = ticketType.quantity_total - ticketType.quantity_sold
              const selectedQuantity = selectedTickets[ticketType.id] || 0
              // Untuk tickets_per_purchase === 1, tidak ada pembatasan max kuota selain stok tersedia
              const maxQuantity = ticketType.tickets_per_purchase === 1 ? availableTickets : Math.min(availableTickets, ticketType.tickets_per_purchase)
              const isSelected = selectedQuantity > 0

              return (
                <Card
                  key={ticketType.id}
                  className={`border-2 transition-colors ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} hover:border-blue-400`}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 sm:mb-4">
                      <div className="flex-1 mb-2 sm:mb-0">
                        <h4 className="font-semibold text-base sm:text-lg">{ticketType.name}</h4>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1 sm:mt-2">
                          {formatPrice(ticketType.price)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Dapat {ticketType.tickets_per_purchase} tiket per pembelian</p>
                      </div>
                      <div className="text-left sm:text-right">
                        {availableTickets > 0 ? (
                          ticketType.tickets_per_purchase === 1 ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateTicketQuantity(ticketType.id, selectedQuantity - 1)}
                                  disabled={selectedQuantity === 0}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                                </Button>
                                <span className="w-6 sm:w-8 text-center font-medium text-sm sm:text-base">
                                  {selectedQuantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateTicketQuantity(ticketType.id, selectedQuantity + 1)}
                                  disabled={selectedQuantity >= maxQuantity}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                id={`ticket-radio-${ticketType.id}`}
                                name="ticket-radio-group"
                                checked={selectedQuantity > 0}
                                onChange={() => updateTicketQuantity(ticketType.id, selectedQuantity > 0 ? 0 : 1)}
                                disabled={availableTickets < ticketType.tickets_per_purchase}
                              />
                              <label htmlFor={`ticket-radio-${ticketType.id}`} className="text-sm">
                                Pilih paket ini (dapat {ticketType.tickets_per_purchase} tiket)
                              </label>
                            </div>
                          )
                        ) : (
                          <div className="text-center py-2">
                            <p className="text-gray-500 text-sm">Tiket sudah habis</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Customer Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Informasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm">
                Nama Lengkap
              </Label>
              <Input
                type="text"
                id="name"
                placeholder="Nama Lengkap"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value)
                  if (typeof window !== "undefined") localStorage.setItem(LS_NAME_KEY, e.target.value)
                }}
                className="text-sm"
                maxLength={50}
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              <Input
                type="email"
                id="email"
                placeholder="Email"
                value={customerEmail}
                onChange={(e) => {
                  handleEmailChange(e.target.value)
                  if (typeof window !== "undefined") localStorage.setItem(LS_EMAIL_KEY, e.target.value)
                }}
                className={`text-sm ${emailError ? "border-red-500" : ""}`}
                maxLength={50}
              />
              {emailError && <p className="text-red-600 text-xs mt-1">{emailError}</p>}
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm">
                Nomor Telepon
              </Label>
              <Input
                type="tel"
                id="phone"
                placeholder="08xxxxxxxxxx"
                value={customerPhone}
                onChange={(e) => {
                  handlePhoneChange(e.target.value)
                  if (typeof window !== "undefined") localStorage.setItem(LS_PHONE_KEY, e.target.value)
                }}
                className={`text-sm ${phoneError ? "border-red-500" : ""}`}
                maxLength={15}
              />
              {phoneError && <p className="text-red-600 text-xs mt-1">{phoneError}</p>}
              <p className="text-xs text-gray-500 mt-1">Nomor akan otomatis dikonversi ke format internasional</p>
            </div>
          </CardContent>
        </Card>

        {/* Voucher Section dipindah ke sini */}
        {getTotalTickets() > 0 && (
          <>
            <Separator />
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
                  Kode Voucher
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!appliedVoucher ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Masukkan kode voucher"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      className="text-sm"
                    />
                    <Button
                      onClick={applyVoucher}
                      disabled={voucherLoading || !voucherCode.trim()}
                      size="sm"
                      className="whitespace-nowrap"
                    >
                      {voucherLoading ? "..." : "Terapkan"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800 text-sm">{appliedVoucher.code}</p>
                        <p className="text-xs text-green-600">{appliedVoucher.description}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removeVoucher} className="h-8 w-8 p-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {voucherError && <p className="text-red-600 text-xs mt-2">{voucherError}</p>}
              </CardContent>
            </Card>
          </>
        )}

        {/* Attendee Forms */}
        {getTotalTickets() > 0 && (
          <AttendeeForms
            eventId={event.id}
            totalTickets={getTotalTickets()}
            customerData={{
              name: customerName,
              email: customerEmail,
              phone: customerPhone
            }}
            onAttendeeDataChange={setAttendeeData}
          />
        )}

        {/* Payment Method - Radio Buttons */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
              Metode Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex-1 text-base text-gray-700 flex items-center gap-2">
                {paymentChannel && paymentChannels.find((c: any) => c.pg_code === paymentChannel)?.image_url && (
                  <Image src={paymentChannels.find((c: any) => c.pg_code === paymentChannel)?.image_url} alt={paymentChannels.find((c: any) => c.pg_code === paymentChannel)?.pg_name} width={28} height={20} className="object-contain" />
                )}
                {paymentChannel
                  ? paymentChannels.find((c: any) => c.pg_code === paymentChannel)?.pg_name || "Pilih Metode Pembayaran"
                  : "Pilih Metode Pembayaran"}
              </span>
              <Dialog open={isPaymentPopoverOpen} onOpenChange={setIsPaymentPopoverOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    className="bg-sky-400 hover:bg-sky-500 text-white font-bold rounded-full px-6 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
                    onClick={() => setIsPaymentPopoverOpen(true)}
                  >
                    Pilih <span className="ml-1">▼</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-full sm:max-w-md p-0 data-[state=open]:animate-none data-[state=closed]:animate-none h-[90vh] sm:h-auto overflow-y-auto">
                  <div className="p-4 max-w-full overflow-x-hidden">
                    <h4 className="font-semibold text-xl sm:text-base mb-6 sm:mb-4">Pilih Metode Pembayaran</h4>
                    <RadioGroup value={paymentChannel} onValueChange={(val) => { setPaymentChannel(val); setIsPaymentPopoverOpen(false); }}>
                      <div className="space-y-2">
                        {paymentChannels.map((channel: any) => {
                          const selected = paymentChannel === channel.pg_code;
                          return (
                            <label
                              key={channel.id}
                              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all duration-75 bg-white shadow-sm ${selected ? 'bg-blue-50 border-blue-500 font-bold ring-2 ring-blue-200' : 'hover:bg-gray-100 border-gray-200'}`}
                            >
                              <RadioGroupItem value={channel.pg_code} id={channel.pg_code} />
                              {channel.image_url && (
                                <Image src={channel.image_url} alt={channel.pg_name} width={32} height={24} className="object-contain" />
                              )}
                              <span className="text-base sm:text-sm">{channel.pg_name}</span>
                            </label>
                          )
                        })}
                      </div>
                    </RadioGroup>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Order Summary - Mobile Optimized */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 sm:p-6">
            <h4 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg">Ringkasan Pesanan</h4>

            <div className="space-y-2 mb-3 sm:mb-4">
              {Object.entries(selectedTickets)
                .filter(([_, quantity]) => quantity > 0)
                .map(([ticketTypeId, quantity]) => {
                  const ticketType = event.ticket_types.find((tt: any) => tt.id === Number.parseInt(ticketTypeId))
                  return (
                    <div key={ticketTypeId} className="flex justify-between text-xs sm:text-sm">
                      <span>
                        {ticketType?.name} x {quantity}
                      </span>
                      <span>{formatPrice(ticketType?.price * quantity)}</span>
                    </div>
                  )
                })}
            </div>

            <Separator className="my-3 sm:my-4" />

            <div className="space-y-2 text-sm">
              {appliedVoucher && (
                <div className="flex justify-between text-green-600">
                  <span>Diskon ({appliedVoucher.code})</span>
                  <span>-{formatPrice(getDiscountAmount())}</span>
                </div>
              )}
            </div>

            <Separator className="my-3 sm:my-4" />

            <div className="flex justify-between items-center mb-4">
              <span className="font-medium text-base sm:text-lg">Total:</span>
              <span className="text-lg sm:text-xl font-bold text-blue-600">{formatPrice(getFinalAmount())}</span>
            </div>

            <Button onClick={handleCheckout} className="w-full" size="lg" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Lanjutkan Pembayaran"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
