import { pgTable, bigserial, bigint, boolean, text, timestamp } from "drizzle-orm/pg-core"

export const tickets = pgTable("tickets", {
  id: bigserial("id").primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).notNull(),
  ticketTypeId: bigint("ticket_type_id", { mode: "number" }).notNull(),
  ticketCode: text("ticket_code").notNull(),
  attendeeName: text("attendee_name"),
  attendeeEmail: text("attendee_email"),
  attendeePhoneNumber: text("attendee_phone_number"),
  isCheckedIn: boolean("is_checked_in").notNull().default(false),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
})

