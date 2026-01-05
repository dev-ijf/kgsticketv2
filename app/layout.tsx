import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import RootLayoutClient from "@/components/root-layout-client"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  generator: "v0.app",
  title: "KGS Ticket - Platform Tiket Event Terpercaya",
  description: "Platform tiket event terpercaya dengan sistem pembayaran yang aman dan mudah. Dapatkan tiket event favorit Anda dengan cepat dan mudah.",
  keywords: "tiket event, platform tiket, event indonesia, pembayaran online, tiket konser",
  authors: [{ name: "KGS Ticket" }],
  creator: "KGS Ticket",
  publisher: "KGS Ticket",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://event.kreativaglobal.id'),
  openGraph: {
    title: "KGS Ticket - Platform Tiket Event Terpercaya",
    description: "Platform tiket event terpercaya dengan sistem pembayaran yang aman dan mudah.",
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://event.kreativaglobal.id',
    siteName: "KGS Ticket",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KGS Ticket - Platform Tiket Event Terpercaya",
    description: "Platform tiket event terpercaya dengan sistem pembayaran yang aman dan mudah.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <RootLayoutClient className={inter.className}>{children}</RootLayoutClient>
    </html>
  )
}
