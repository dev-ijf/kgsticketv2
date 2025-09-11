import { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getOrderWithDetails } from "@/lib/data"

export async function GET(req: NextRequest, { params }: { params: { orderReference: string } }) {
  const { orderReference } = params
  try {
    const order = await getOrderWithDetails(orderReference)
    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 })
    }
    return NextResponse.json({ status: order.status })
  } catch (e) {
    return NextResponse.json({ error: "Gagal mengambil status order" }, { status: 500 })
  }
}
