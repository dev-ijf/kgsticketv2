import { pgTable, bigserial, bigint, boolean, integer, numeric, text, timestamp } from "drizzle-orm/pg-core"

export const orders = pgTable("orders", {
  id: bigserial("id").primaryKey(),
  customerId: bigint("customer_id", { mode: "number" }),
  eventId: bigint("event_id", { mode: "number" }),
  paymentChannelId: bigint("payment_channel_id", { mode: "number" }),
  discountId: bigint("discount_id", { mode: "number" }),
  orderReference: text("order_reference").notNull(),
  virtualAccountNumber: text("virtual_account_number"),
  paymentResponseUrl: text("payment_response_url"),
  status: text("status").notNull(),
  proofTransfer: text("proof_transfer"),
  isEmailPaid: boolean("is_email_paid").default(false),
  isWaPaid: boolean("is_wa_paid").default(false),
  isEmailCheckout: boolean("is_email_checkout").default(false),
  isWaCheckout: boolean("is_wa_checkout").default(false),
  uniqueCode: integer("unique_code"),
  orderDate: timestamp("order_date", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  grossAmount: numeric("gross_amount"),
  discountAmount: numeric("discount_amount"),
  finalAmount: numeric("final_amount"),
})

