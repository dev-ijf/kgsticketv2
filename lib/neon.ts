import { neon } from "@neondatabase/serverless"

// Use pooled connection for better performance
const sql = neon(process.env.DATABASE_URL!, {
  // Connection pool settings for better performance
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20, // Maximum number of connections in the pool
})

export { sql }

// Helper functions for database operations
export async function createOrder(orderData: any) {
  try {
    const result = await sql`
      INSERT INTO orders (
        order_reference, virtual_account_number, payment_response_url,
        customer_id, event_id, payment_channel_id, discount_id,
        gross_amount, discount_amount, final_amount, status,
        is_email_checkout, is_wa_checkout, unique_code, proof_transfer
      ) VALUES (
        ${orderData.order_reference}, ${orderData.virtual_account_number}, ${orderData.payment_response_url},
        ${orderData.customer_id}, ${orderData.event_id}, ${orderData.payment_channel_id}, ${orderData.discount_id},
        ${orderData.gross_amount}, ${orderData.discount_amount}, ${orderData.final_amount}, ${orderData.status},
        ${orderData.is_email_checkout}, ${orderData.is_wa_checkout}, ${orderData.unique_code}, ${orderData.proof_transfer}
      )
      RETURNING *
    `
    return result[0]
  } catch (error) {
    console.error("Error creating order:", error)
    throw error
  }
}

export async function updateOrderStatus(orderReference: string, status: string, paidAt?: string) {
  try {
    const updateData: any = { status, updated_at: new Date().toISOString() }
    if (paidAt) updateData.paid_at = paidAt

    const result = await sql`
      UPDATE orders 
      SET status = ${status}, 
          updated_at = ${updateData.updated_at}
          ${paidAt ? sql`, paid_at = ${paidAt}` : sql``}
      WHERE order_reference = ${orderReference}
      RETURNING *
    `
    return result[0]
  } catch (error) {
    console.error("Error updating order status:", error)
    throw error
  }
}

export async function getOrderByReference(orderReference: string) {
  try {
    const result = await sql`
      SELECT 
        o.*,
        row_to_json(c.*) as customer,
        row_to_json(e.*) as event,
        row_to_json(pc.*) as payment_channel,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'order_id', oi.order_id,
              'ticket_type_id', oi.ticket_type_id,
              'quantity', oi.quantity,
              'price_per_ticket', oi.price_per_ticket,
              'effective_ticket_count', oi.effective_ticket_count,
              'created_at', oi.created_at,
              'ticket_type', row_to_json(tt.*)
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'::json
        ) as order_items
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN events e ON o.event_id = e.id
      LEFT JOIN payment_channels pc ON o.payment_channel_id = pc.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN ticket_types tt ON oi.ticket_type_id = tt.id
      WHERE o.order_reference = ${orderReference}
      GROUP BY o.id, c.*, e.*, pc.*
    `
    return result[0]
  } catch (error) {
    console.error("Error fetching order by reference:", error)
    throw error
  }
}

export async function createTickets(ticketsData: any[]) {
  try {
    const values = ticketsData.map(
      (ticket) =>
        sql`(${ticket.order_id}, ${ticket.ticket_type_id}, ${ticket.ticket_code}, ${ticket.attendee_name}, ${ticket.attendee_email})`,
    )

    const result = await sql`
      INSERT INTO tickets (order_id, ticket_type_id, ticket_code, attendee_name, attendee_email)
      VALUES ${sql(values)}
      RETURNING *
    `
    return result
  } catch (error) {
    console.error("Error creating tickets:", error)
    throw error
  }
}
