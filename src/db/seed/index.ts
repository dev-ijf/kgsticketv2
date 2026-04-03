import { drizzle } from "drizzle-orm/neon-serverless"
import { neon } from "@neondatabase/serverless"
import { events } from "../schema/events"
import { ticketTypes } from "../schema/ticketTypes"
import { orders } from "../schema/orders"
import { tickets } from "../schema/tickets"

const SEED_PROFILE = process.env.SEED_PROFILE || "default"

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set")
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)
  const db = drizzle(sql)

  // Basic example seeds – kept minimal and generic so they work
  // across institutions. Extend per profile as needed.

  if (SEED_PROFILE === "default" || SEED_PROFILE === "kreativa") {
    const [event] = await db
      .insert(events)
      .values({
        name: "Sample Event",
        slug: "sample-event",
        location: "Sample Location",
        description: "Event contoh untuk inisialisasi database.",
        startDate: new Date(),
      })
      .returning()

    await db.insert(ticketTypes).values({
      eventId: Number(event.id),
      name: "General Admission",
      price: "100000",
      quantityTotal: 100,
      quantitySold: 0,
      ticketsPerPurchase: 4,
    })
  }

  console.log(`Seed completed for profile: ${SEED_PROFILE}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

