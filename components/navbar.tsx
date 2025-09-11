"use client"

import Link from "next/link"
import Image from "next/image"

export function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/kgs_ticket/public/images/logo-kgs.png"
                alt="KGS Logo"
                width={40}
                height={40}
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-gray-900">Kreativa Global Event</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
