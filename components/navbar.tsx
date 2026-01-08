"use client"

import Link from "next/link"
import Image from "next/image"

export function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="https://tguray8zidjbrs4r.public.blob.vercel-storage.com/logo/logo-ken-full.png"
                alt="Kreativa Education Logo"
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
              <span className="text-xl font-bold text-gray-900">Kreativa Education Event</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
