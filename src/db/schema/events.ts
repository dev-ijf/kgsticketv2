import { pgTable, bigserial, bigint, text, timestamp } from "drizzle-orm/pg-core"

export const events = pgTable("events", {
  id: bigserial("id").primaryKey(),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  imageUrl: text("image_url"),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull(),
  location: text("location"),
})

