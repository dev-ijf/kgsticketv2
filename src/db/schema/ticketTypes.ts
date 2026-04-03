import { pgTable, bigserial, bigint, integer, numeric, text, timestamp } from "drizzle-orm/pg-core"

export const ticketTypes = pgTable("ticket_types", {
  id: bigserial("id").primaryKey(),
  eventId: bigint("event_id", { mode: "number" }).notNull(),
  name: text("name").notNull(),
  price: numeric("price").notNull(),
  quantityTotal: integer("quantity_total").notNull(),
  quantitySold: integer("quantity_sold").notNull(),
  ticketsPerPurchase: integer("tickets_per_purchase"),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
})

