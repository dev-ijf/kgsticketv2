-- Initial snapshot migration for provisioning new databases.
-- This mirrors the existing core tables structure. It is intended
-- for new environments only and should not be applied to the
-- current production database.

-- NOTE: This file is hand-written and not managed by drizzle-kit.
-- If you regenerate migrations, keep this file or port its contents.

-- Events
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  image_url TEXT,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  location TEXT
);

-- Ticket types
CREATE TABLE IF NOT EXISTS ticket_types (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity_total INTEGER NOT NULL,
  quantity_sold INTEGER NOT NULL,
  tickets_per_purchase INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  ticket_type_id BIGINT NOT NULL,
  ticket_code TEXT NOT NULL,
  attendee_name TEXT,
  attendee_email TEXT,
  attendee_phone_number TEXT,
  is_checked_in BOOLEAN DEFAULT FALSE NOT NULL,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT,
  event_id BIGINT,
  payment_channel_id BIGINT,
  discount_id BIGINT,
  order_reference TEXT NOT NULL,
  virtual_account_number TEXT,
  payment_response_url TEXT,
  status TEXT NOT NULL,
  proof_transfer TEXT,
  is_email_paid BOOLEAN DEFAULT FALSE,
  is_wa_paid BOOLEAN DEFAULT FALSE,
  is_email_checkout BOOLEAN DEFAULT FALSE,
  is_wa_checkout BOOLEAN DEFAULT FALSE,
  unique_code INTEGER,
  order_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  gross_amount NUMERIC,
  discount_amount NUMERIC,
  final_amount NUMERIC
);

-- Basic foreign keys (aligning with current usage)
ALTER TABLE ticket_types
  ADD CONSTRAINT ticket_types_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events (id);

ALTER TABLE tickets
  ADD CONSTRAINT tickets_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders (id),
  ADD CONSTRAINT tickets_ticket_type_id_fkey
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types (id);

