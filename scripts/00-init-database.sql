-- Initialize Neon Database for KGS Ticket System
-- This script sets up the basic database structure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'Asia/Jakarta';

-- Create sequences if they don't exist
CREATE SEQUENCE IF NOT EXISTS customers_id_seq;
CREATE SEQUENCE IF NOT EXISTS events_id_seq;
CREATE SEQUENCE IF NOT EXISTS ticket_types_id_seq;
CREATE SEQUENCE IF NOT EXISTS payment_channels_id_seq;
CREATE SEQUENCE IF NOT EXISTS orders_id_seq;
CREATE SEQUENCE IF NOT EXISTS order_items_id_seq;
CREATE SEQUENCE IF NOT EXISTS tickets_id_seq;
CREATE SEQUENCE IF NOT EXISTS discounts_id_seq;
CREATE SEQUENCE IF NOT EXISTS discount_ticket_types_id_seq;
CREATE SEQUENCE IF NOT EXISTS payment_logs_id_seq;
CREATE SEQUENCE IF NOT EXISTS notification_templates_id_seq;
CREATE SEQUENCE IF NOT EXISTS notification_logs_id_seq;
CREATE SEQUENCE IF NOT EXISTS payment_instructions_id_seq;
CREATE SEQUENCE IF NOT EXISTS orders_temp_id_seq;

-- Grant necessary permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO neondb_owner;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO neondb_owner;
