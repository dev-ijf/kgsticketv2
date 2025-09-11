import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import RootLayoutClient from "@/components/root-layout-client"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  generator: "v0.app",
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
