"use client"

import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { useCallback } from "react"

interface ShareEventButtonProps {
  eventName: string
}

export function ShareEventButton({ eventName }: ShareEventButtonProps) {
  const handleShare = useCallback(() => {
    if (typeof window === "undefined") return
    if (navigator.share) {
      navigator.share({
        title: eventName,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("Link event telah disalin!")
    }
  }, [eventName])

  return (
    <Button variant="secondary" size="sm" className="bg-white/90 backdrop-blur-sm" onClick={handleShare}>
      <Share2 className="w-4 h-4" />
      <span className="ml-2 hidden sm:inline">Bagikan Event</span>
    </Button>
  )
}
