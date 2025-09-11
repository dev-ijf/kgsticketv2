"use client"
import type React from "react"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Toaster } from "sonner"
import Spinner from "@/components/ui/spinner"

interface RootLayoutClientProps {
  children: React.ReactNode
  className: string
}

export default function RootLayoutClient({ children, className }: RootLayoutClientProps) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [prevPath, setPrevPath] = useState(pathname)

  useEffect(() => {
    if (prevPath !== pathname) {
      setLoading(true)
      // Simulasikan delay minimal agar spinner terlihat, bisa dihapus jika tidak perlu
      const timeout = setTimeout(() => {
        setLoading(false)
        setPrevPath(pathname)
      }, 300) // 300ms, bisa diubah sesuai selera
      return () => clearTimeout(timeout)
    } else {
      setLoading(false)
    }
  }, [pathname, prevPath])

  return (
    <body className={className + " bg-white min-h-screen m-0 p-0 !m-0 !p-0"}>
      <Navbar />
      <Toaster richColors position="top-center" />
      {loading && (
        <div className="fixed inset-0 z-50 bg-white bg-opacity-80 flex items-center justify-center">
          <Spinner />
        </div>
      )}
      {children}
    </body>
  )
}
