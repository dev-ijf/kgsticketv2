"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Clock, CheckCircle, XCircle, AlertCircle, Copy, Check, ExternalLink } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import QRCode from "react-qr-code"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { upload } from '@vercel/blob/client';
import Image from 'next/image';
import Barcode from "react-barcode"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

interface PaymentInstruction {
  id: string
  title: string
  content?: string
  description?: string
  step_order: number
}

interface PaymentPageProps {
  order: {
    order_reference: string
    status: string
    final_amount: number
    gross_amount: number
    discount_amount: number
    virtual_account_number?: string
    payment_response_url?: string
    created_at: string
    customer?: {
      name: string
      email: string
      phone_number?: string
    }
    event?: {
      name: string
      title: string
      location: string
      start_date?: string
      end_date?: string
      event_date?: string
      slug?: string // tambahkan slug jika ada
    }
    order_items?: Array<{
      quantity: number
      price_per_ticket: number
      ticket_type?: {
        name: string
      }
    }>
    payment_channel?: {
      pg_name: string
      image_url?: string
      is_redirect?: boolean
      category?: string // Tambahkan category
      pg_code?: string // Tambahkan pg_code
      image_qris?: string // Tambahkan image_qris
      total_with_unique?: number // Tambahkan total_with_unique
    }
    tickets?: Array<{
      ticket_code: string
    }>
    proof_transfer?: string; // Tambahkan field proof_transfer
  }
  paymentInstructions: PaymentInstruction[]
}

export default function PaymentPage({ order, paymentInstructions }: PaymentPageProps) {
  const [openSteps, setOpenSteps] = useState<{ [key: string]: boolean }>({})
  const [countdown, setCountdown] = useState(0)
  const [copied, setCopied] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [orderStatus, setOrderStatus] = useState(order.status)
  const [showCountdown, setShowCountdown] = useState(order.status === "pending")
  const [autoRefreshing, setAutoRefreshing] = useState(false)
  const [showRedirectDialog, setShowRedirectDialog] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(5)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState(order.proof_transfer || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tambahkan state untuk tab aktif per tiket
  type TabType = 'qr' | 'barcode';
  const [activeTabs, setActiveTabs] = useState<{ [ticketCode: string]: TabType }>({});
  const searchParams = useSearchParams();
  const [showSpinner, setShowSpinner] = useState(false);
  useEffect(() => {
    if (searchParams.get("loading") === "1") {
      setShowSpinner(true);
      setTimeout(() => setShowSpinner(false), 300);
    }
  }, [searchParams]);

  const handleTabChange = (ticketCode: string, tab: TabType) => {
    setActiveTabs((prev) => ({ ...prev, [ticketCode]: tab }));
  };

  // Set first step open by default
  useEffect(() => {
    if (paymentInstructions.length > 0) {
      const sortedInstructions = [...paymentInstructions].sort((a, b) => a.step_order - b.step_order)
      const firstInstruction = sortedInstructions[0]
      if (firstInstruction) {
        setOpenSteps({ [firstInstruction.id]: true })
      }
    }
  }, [paymentInstructions])

  // Handle redirect untuk payment channels dengan is_redirect = true
  useEffect(() => {
    if (
      order.status === "pending" && 
      order.payment_channel?.is_redirect && 
      order.payment_response_url &&
      !showRedirectDialog &&
      !isRedirecting
    ) {
      // Tampilkan dialog redirect setelah 2 detik
      const timer = setTimeout(() => {
        setShowRedirectDialog(true)
        setIsRedirecting(true)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [order.status, order.payment_channel?.is_redirect, order.payment_response_url, showRedirectDialog, isRedirecting])

  // Handle countdown redirect
  useEffect(() => {
    if (showRedirectDialog && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1)
      }, 1000)

      return () => clearTimeout(timer)
    } else if (showRedirectDialog && redirectCountdown === 0) {
      // Redirect ke payment_response_url di tab yang sama
      if (order.payment_response_url) {
        window.location.href = order.payment_response_url
        // Note: Tidak perlu setShowRedirectDialog(false) karena halaman akan redirect
      }
    }
  }, [showRedirectDialog, redirectCountdown, order.payment_response_url])

  // Reset redirect countdown when dialog opens
  useEffect(() => {
    if (showRedirectDialog) {
      setRedirectCountdown(5)
    }
  }, [showRedirectDialog])

  useEffect(() => {
    // Calculate countdown - 5 hours from order creation
    let statusInterval: NodeJS.Timeout | null = null;
    const calculateCountdown = () => {
      const createdAt = new Date(order.created_at)
      const expiryTime = new Date(createdAt.getTime() + 5 * 60 * 60 * 1000) // 5 hours
      const now = new Date()
      const difference = expiryTime.getTime() - now.getTime()

      if (difference > 0) {
        setCountdown(Math.floor(difference / 1000))
      } else {
        setCountdown(0)
      }
    }

    calculateCountdown()
    const countdownInterval = setInterval(calculateCountdown, 1000)

    // Auto refresh status setiap 30 detik untuk status pending
    if (orderStatus === "pending") {
      statusInterval = setInterval(async () => {
        try {
          setAutoRefreshing(true)
          // Delay kecil untuk menampilkan loading state
          await new Promise(resolve => setTimeout(resolve, 500))
          
          const res = await fetch(`/api/orders/status/${order.order_reference}`)
          const data = await res.json()
          if (data.status && data.status !== orderStatus) {
            setOrderStatus(data.status)
            if (data.status === "paid") {
              setShowCountdown(false)
              toast.success("Pembayaran sudah diterima!")
              setTimeout(() => {
                window.location.reload()
              }, 2000)
            }
          }
        } catch (e) {
          console.log("Auto refresh status failed:", e)
        } finally {
          // Delay kecil sebelum menghilangkan loading state
          setTimeout(() => {
            setAutoRefreshing(false)
          }, 500)
        }
      }, 30000) // 30 detik
    }

    return () => {
      clearInterval(countdownInterval)
      if (statusInterval) {
        clearInterval(statusInterval)
      }
    }
  }, [order.created_at, orderStatus, order.order_reference])

  const toggleStep = (stepId: string) => {
    setOpenSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }))
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast(
        "Gagal menyalin nomor virtual account",
        {
          icon: <XCircle className="text-red-500" />, // icon gagal
          duration: 2000,
        }
      )
      console.error("Failed to copy: ", err)
    }
  }

  // Fungsi copy dengan toast custom
  const copyRekening = async (text: string) => {
    await copyToClipboard(text);
    toast.success('Nomor Rekening berhasil disalin');
  };
  const copyNominal = async (text: string) => {
    await copyToClipboard(text);
    toast.success('Nominal berhasil disalin');
  };

  // Fungsi format nominal sesuai standar: Rp.150.123
  function formatRupiahStandard(amount: number | string) {
    const num = typeof amount === 'number' ? amount : Number(amount);
    if (isNaN(num)) return '-';
    return `Rp${num.toLocaleString('id-ID')}`;
  }

  const handleManualRedirect = () => {
    if (order.payment_response_url) {
      window.location.href = order.payment_response_url
      // Note: Tidak perlu setShowRedirectDialog(false) karena halaman akan redirect
    }
  }

  const checkPaymentStatus = async () => {
    setCheckingStatus(true)
    try {
      // Delay kecil untuk menampilkan loading state
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const res = await fetch(`/api/orders/status/${order.order_reference}`)
      const data = await res.json()
      if (data.status) {
        setOrderStatus(data.status)
        if (data.status === "paid") {
          setShowCountdown(false)
          toast.success("Pembayaran sudah diterima!")
          // Refresh page setelah 2 detik untuk menampilkan QR code
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        } else {
          toast("Status pesanan: " + data.status)
          // Refresh page untuk update data terbaru
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
      } else {
        toast.error("Gagal cek status pembayaran")
        setTimeout(() => {
          setCheckingStatus(false)
        }, 500)
      }
    } catch (e) {
      toast.error("Gagal cek status pembayaran")
      setTimeout(() => {
        setCheckingStatus(false)
      }, 500)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "expired":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "expired":
        return "bg-red-100 text-red-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  // Sort instructions by step_order
  const sortedInstructions = [...paymentInstructions].sort((a, b) => a.step_order - b.step_order)

  // Ambil category dan pg_code
  const isBankTransfer = order.payment_channel?.category === 'bank_transfer';
  const isQrisStatis = order.payment_channel?.category === 'qris_statis';
  const rekeningNumber = order.virtual_account_number;
  const nominalKodeUnik = order.final_amount;

  // Fungsi untuk download gambar
  const handleDownloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Gambar QRIS berhasil diunduh');
    } catch (error) {
      toast.error('Gagal mengunduh gambar');
      console.error('Download error:', error);
    }
  };

  // Fungsi upload ke Vercel Blob
  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang diperbolehkan');
      return;
    }
    setUploading(true);
    try {
      // Upload ke /api/blob/upload pakai FormData
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('filename', file.name);
      const res = await fetch('/api/blob/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Gagal upload ke blob');
      const data = await res.json();
      if (!data.url) throw new Error('URL upload tidak ditemukan');
      setProofUrl(data.url);
      // Update ke backend (orders.proof_transfer)
      await fetch(`/api/orders/${order.order_reference}/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof_transfer: data.url }),
      });
      toast.success('Bukti transfer berhasil diupload');
    } catch (err) {
      toast.error('Gagal upload bukti transfer');
    } finally {
      setUploading(false);
    }
  };

  // Tambahkan fungsi untuk format tanggal Indonesia tanpa konversi zona waktu
  function formatDateTimeToIndoString(dateString: string) {
    if (!dateString) return "-";
    // Ambil bagian tanggal dan waktu saja (tanpa konversi zona waktu)
    const dateObj = new Date(dateString);
    // Ambil komponen tanggal dari string asli agar jam tidak berubah
    const [datePart, timePartWithZone] = dateString.split("T");
    const [year, month, day] = datePart.split("-");
    const [timePart] = timePartWithZone.split("+"); // buang zona
    // Hari dalam bahasa Indonesia
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    // Bulan dalam bahasa Indonesia
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    // Dapatkan hari dari objek Date (pakai UTC supaya konsisten dengan string)
    const dayIdx = new Date(`${year}-${month}-${day}T00:00:00Z`).getUTCDay();
    const hari = days[dayIdx];
    const bulan = months[parseInt(month, 10) - 1];
    return `${hari}, ${parseInt(day, 10)} ${bulan} ${year} Pukul ${timePart}`;
  }

  return (
    <>
      {showSpinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        </div>
      )}
      {/* Full Page Loading Overlay untuk Cek Status */}
      {(checkingStatus || autoRefreshing) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center space-y-4 shadow-xl animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {checkingStatus ? "Mengecek Status Pembayaran" : "Memperbarui Status"}
              </h3>
              <p className="text-sm text-gray-600">
                {checkingStatus 
                  ? "Mohon tunggu, sedang memeriksa status pembayaran..." 
                  : "Memperbarui status pembayaran secara otomatis..."
                }
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {order.status === "paid" ? "QR Code Ticket" : "Detail Pembayaran"}
          </h1>
          <p className="text-gray-600">
            {order.status === "paid"
              ? "Tunjukkan QR code di bawah ini saat check in"
              : "Silakan lakukan pembayaran sesuai instruksi di bawah ini"}
          </p>
        </div>

        {/* QR Code Ticket di atas */}
        {order.status === "paid" && order.tickets && order.tickets.length > 0 && (
          <Card>
            
            <CardContent className="space-y-8">
              {order.tickets.map((ticket, idx) => (
                <div key={ticket.ticket_code} className="flex flex-col items-center border rounded-lg bg-white p-6 shadow-sm">
                  <div className="mb-2 font-semibold text-gray-700">Kode tiket: <span className="font-mono text-blue-700">{ticket.ticket_code}</span></div>
                  <div className="w-full max-w-xs">
                    <div className="flex border-b mb-4">
                      <button
                        className={`flex-1 py-2 text-center font-semibold ${activeTabs[ticket.ticket_code] !== 'barcode' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500'}`}
                        onClick={() => handleTabChange(ticket.ticket_code, 'qr')}
                        type="button"
                      >
                        QR Code
                      </button>
                      <button
                        className={`flex-1 py-2 text-center font-semibold ${activeTabs[ticket.ticket_code] === 'barcode' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500'}`}
                        onClick={() => handleTabChange(ticket.ticket_code, 'barcode')}
                        type="button"
                      >
                        Barcode
                      </button>
                    </div>
                    <div className="flex justify-center items-center bg-white p-2 rounded-lg border min-h-[200px]">
                      {activeTabs[ticket.ticket_code] === 'barcode' ? (
                        <Barcode
                          value={ticket.ticket_code}
                          width={2}
                          height={80}
                          displayValue={true}
                          fontSize={16}
                          margin={0}
                          background="#fff"
                          lineColor="#000"
                        />
                      ) : (
                        <QRCode
                          value={ticket.ticket_code}
                          size={180}
                          bgColor="#fff"
                          fgColor="#000"
                          level="M"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Countdown hanya jika belum paid */}
        {showCountdown && countdown > 0 && order.status !== "paid" && (
          <div className="mt-2 text-lg font-semibold text-red-600 text-center">
            Sisa waktu pembayaran: {formatCountdown(countdown)}
          </div>
        )}

        {/* Order Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Status Pesanan</CardTitle>
              <div className="flex items-center gap-2">
                {getStatusIcon(orderStatus)}
                <Badge className={getStatusColor(orderStatus)}>{orderStatus.toUpperCase()}</Badge>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Button
                variant="default"
                size="sm"
                onClick={checkPaymentStatus}
                disabled={checkingStatus}
                className="w-full"
              >
                Cek Status Pembayaran
              </Button>
              {orderStatus === "pending" && (
                <div className="text-center space-y-1">
                  <p className="text-xs text-gray-500">
                    Status akan diperbarui otomatis setiap 30 detik
                  </p>
                  {autoRefreshing && (
                    <div className="flex items-center justify-center gap-2 text-xs text-blue-600">
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Memperbarui status...
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nomor Pesanan</p>
                <p className="font-semibold">{order.order_reference}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Pembayaran</p>
                <p className="font-semibold text-lg">{formatCurrency(order.final_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Metode Pembayaran</p>
                <div className="flex items-center gap-2">
                  {order.payment_channel?.image_url && (
                    <img
                      src={order.payment_channel.image_url || "/placeholder.svg"}
                      alt={order.payment_channel.pg_name}
                      className="h-6 w-auto"
                    />
                  )}
                  <p className="font-semibold">{order.payment_channel?.pg_name}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tanggal Pesanan</p>
                <p className="font-semibold">{formatDateTime(order.created_at)} WIB</p>
              </div>
            </div>

            {(isBankTransfer || isQrisStatis) && (
              <div className="bg-blue-50 p-4 rounded-lg flex flex-col gap-4">
                {isQrisStatis && order.payment_channel?.image_qris && (
                  <div className="flex flex-col items-center mb-4">
                    <p className="text-sm font-semibold text-blue-700 mb-2">Pindai QRIS di bawah ini</p>
                    <div className="bg-white p-2 rounded-lg border">
                      <Image 
                        src={order.payment_channel.image_qris} 
                        alt="QRIS" 
                        width={250} 
                        height={250} 
                        className="rounded"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => handleDownloadImage(order.payment_channel!.image_qris!, `qris-${order.order_reference}.png`)}
                    >
                      Download QRIS
                    </Button>
                  </div>
                )}
                {isBankTransfer && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 mb-1">Nomor Rekening</p>
                      <p className="text-xl font-mono font-bold text-blue-800 tracking-wider">{rekeningNumber}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyRekening(rekeningNumber!)}
                      className="h-8 px-3"
                    >
                      COPY
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-sm text-blue-600 mb-1">Nominal + Kode Unik</p>
                    <p className="text-3xl font-bold text-green-800 tracking-wide font-sans drop-shadow-sm select-all">
                      {nominalKodeUnik ? formatRupiahStandard(nominalKodeUnik) : '-'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyNominal(nominalKodeUnik?.toString() || '')}
                    className="h-8 px-3"
                  >
                    COPY
                  </Button>
                </div>
                <div className="mt-6">
                  <p className="text-sm text-blue-600 mb-1">Upload Bukti Transfer</p>
                  {proofUrl ? (
                    <div className="flex flex-col gap-2">
                      <Image src={proofUrl} alt="Bukti Transfer" width={320} height={180} className="rounded border" />
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Ganti Bukti Transfer'}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? 'Uploading...' : 'Upload Bukti Transfer'}
                    </Button>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleUploadProof}
                    title="Upload bukti transfer"
                  />
                </div>
              </div>
            )}
            
            {!(isBankTransfer || isQrisStatis) && order.virtual_account_number && (
                <div className="bg-blue-50 p-4 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-blue-600 mb-1">Nomor Virtual Account</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await copyToClipboard(order.virtual_account_number!);
                        toast.success('Nomor Virtual Account berhasil disalin');
                      }}
                      className="h-8 px-3"
                    >
                      COPY
                    </Button>
                  </div>
                  <p className="text-xl font-mono font-bold text-blue-800">{order.virtual_account_number}</p>
                </div>
            )}
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detail Event</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Nama Event</p>
                <p className="font-semibold">{order.event?.name || order.event?.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tanggal & Waktu</p>
                <p className="font-semibold">
                  {order.event?.start_date && order.event?.end_date
                    ? `${formatDateTimeToIndoString(order.event.start_date)} - ${formatDateTimeToIndoString(order.event.end_date)} WIB`
                    : order.event?.event_date
                      ? `${formatDateTimeToIndoString(order.event.event_date)} WIB`
                      : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Lokasi</p>
                <p className="font-semibold">{order.event?.location}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detail Tiket</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.order_items?.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2">
                  <div>
                    <p className="font-semibold">{item.ticket_type?.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity} tiket × {formatCurrency(item.price_per_ticket)}
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(item.quantity * item.price_per_ticket)}</p>
                </div>
              ))}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <p>Subtotal</p>
                  <p>{formatCurrency(order.gross_amount)}</p>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <p>Diskon</p>
                    <p>-{formatCurrency(order.discount_amount)}</p>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg">
                  <p>Total</p>
                  <p>{formatCurrency(order.final_amount)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detail Pemesan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nama</p>
                <p className="font-semibold">{order.customer?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold">{order.customer?.email}</p>
              </div>
              {order.customer?.phone_number && (
                <div>
                  <p className="text-sm text-gray-600">Nomor Telepon</p>
                  <p className="font-semibold">{order.customer.phone_number}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions hanya jika belum paid */}
        {order.status !== "paid" && sortedInstructions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cara Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sortedInstructions.map((instruction) => (
                <Collapsible
                  key={instruction.id}
                  open={openSteps[instruction.id] || false}
                  onOpenChange={() => toggleStep(instruction.id)}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between p-4 h-auto text-left bg-transparent">
                      <span className="font-medium">{instruction.title}</span>
                      {openSteps[instruction.id] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div
                        className="text-sm text-gray-700 leading-relaxed [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-2 [&_li]:leading-relaxed [&_ol]:pl-0 [&_li]:pl-0"
                        dangerouslySetInnerHTML={{
                          __html: instruction.content || instruction.description || "",
                        }}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Important Notes */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold text-yellow-800">Penting!</p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Lakukan pembayaran sesuai dengan nominal yang tertera</li>
                  <li>• Pembayaran akan dikonfirmasi otomatis dalam 1-5 menit (khusus VA dan e-wallet)</li>
                  <li>• Pembayaran melalui QRIS dan Bank transfer akan dikonfirmasi dalam 1 x 24 jam</li>
                  <li>• Hubungi customer service jika ada kendala</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Redirect Dialog */}
      <Dialog open={showRedirectDialog} onOpenChange={(open) => {
        // Hanya izinkan menutup dialog jika countdown sudah selesai
        if (!open && redirectCountdown > 0) {
          return
        }
        setShowRedirectDialog(open)
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-blue-600" />
              Dialihkan ke Halaman Pembayaran
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-lg font-semibold text-gray-800 mb-2">
                Anda akan dialihkan dalam {redirectCountdown} detik
              </p>
              <p className="text-sm text-gray-600">
                Anda akan dialihkan ke halaman pembayaran vendor
              </p>
            </div>
            
            <div className="space-y-3">
              <Button
                variant="default"
                size="lg"
                onClick={handleManualRedirect}
                className="w-full"
                disabled={redirectCountdown > 0}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {redirectCountdown > 0 ? `Tunggu ${redirectCountdown} detik lagi` : "Buka Halaman Pembayaran Sekarang"}
              </Button>
              
              {redirectCountdown === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRedirectDialog(false)}
                  className="w-full"
                >
                  Tutup Dialog
                </Button>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-4">
              Setelah pembayaran selesai, Anda akan dikembalikan ke halaman ini
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
