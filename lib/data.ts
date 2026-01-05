import { sql } from "./neon";
import { redis } from "./redis";

export async function getEvents() {
  const cacheKey = "events:all";
  // Cek cache Redis dulu
  try {
    const cached = await redis.get(cacheKey);
    if (cached && typeof cached === "string") {
      const parsedCache = JSON.parse(cached);
      if (Array.isArray(parsedCache)) {
        return parsedCache;
      }
    }
  } catch (cacheError) {
    console.log("Cache error, fetching from database:", cacheError);
  }

  try {
    const events = await sql`
      SELECT * FROM events
      ORDER BY created_at DESC
    `;

    // Simpan ke Redis selama 15 menit (900 detik) untuk performa lebih baik
    try {
      await redis.setex(cacheKey, 900, JSON.stringify(events || []));
    } catch (cacheError) {
      console.log("Failed to cache events:", cacheError);
    }
    return events || [];
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

export async function getEventBySlug(slug: string) {
  try {
    // Try to get from cache first
    const cacheKey = `event:${slug}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached && typeof cached === "string") {
        const parsedCache = JSON.parse(cached);
        if (parsedCache && parsedCache.id) {
          return parsedCache;
        }
      }
    } catch (cacheError) {
      console.log("Cache error, fetching from database:", cacheError);
    }

    const result = await sql`
      SELECT
        e.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', tt.id,
              'name', tt.name,
              'price', tt.price,
              'quantity_total', tt.quantity_total,
              'quantity_sold', tt.quantity_sold,
              'tickets_per_purchase', tt.tickets_per_purchase
            )
          ) FILTER (WHERE tt.id IS NOT NULL),
          '[]'::json
        ) as ticket_types
      FROM events e
      LEFT JOIN ticket_types tt ON e.id = tt.event_id
      WHERE e.slug = ${slug}
      GROUP BY e.id
    `;

    const event = result[0] || null;

    // Cache for 15 minutes only if event exists untuk performa lebih baik
    if (event) {
      try {
        await redis.setex(cacheKey, 900, JSON.stringify(event));
      } catch (cacheError) {
        console.log("Failed to cache event:", cacheError);
      }
    }

    return event;
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}

export async function getTicketTypes(eventId: number) {
  try {
    const cacheKey = `ticket_types:${eventId}`;
    
    // Try cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached && typeof cached === "string") {
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.log("Cache error for ticket types:", cacheError);
    }

    const ticketTypes = await sql`
      SELECT * FROM ticket_types
      WHERE event_id = ${eventId}
      ORDER BY price ASC
    `;

    // Cache for 10 minutes
    if (ticketTypes) {
      try {
        await redis.setex(cacheKey, 600, JSON.stringify(ticketTypes));
      } catch (cacheError) {
        console.log("Failed to cache ticket types:", cacheError);
      }
    }

    return ticketTypes || [];
  } catch (error) {
    console.error("Error fetching ticket types:", error);
    return [];
  }
}

export async function getPaymentChannels() {
  try {
    const cacheKey = "payment_channels";

    try {
      const cached = await redis.get(cacheKey);
      if (cached && typeof cached === "string") {
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.log("Cache error for payment channels:", cacheError);
    }

    const channels = await sql`
      SELECT * FROM payment_channels
      WHERE is_active = true
      ORDER BY sort_order ASC
    `;

    // Cache for 2 hours untuk performa lebih baik
    if (channels) {
      try {
        await redis.setex(cacheKey, 7200, JSON.stringify(channels));
      } catch (cacheError) {
        console.log("Failed to cache payment channels:", cacheError);
      }
    }

    return channels || [];
  } catch (error) {
    console.error("Error fetching payment channels:", error);
    return [];
  }
}

export async function createCustomer(customerData: {
  name: string;
  email: string;
  phone_number?: string;
}) {
  try {
    let existingCustomer = null;
    if (customerData.email) {
      const result = await sql`
        SELECT * FROM customers
        WHERE email = ${customerData.email}
        ${customerData.phone_number ? sql`OR phone_number = ${customerData.phone_number}` : sql``}
        LIMIT 1
      `;
      existingCustomer = result[0];
    } else if (customerData.phone_number) {
      const result = await sql`
        SELECT * FROM customers
        WHERE phone_number = ${customerData.phone_number}
        LIMIT 1
      `;
      existingCustomer = result[0];
    }

    if (existingCustomer) {
      return existingCustomer;
    }

    const result = await sql`
      INSERT INTO customers (name, email, phone_number)
      VALUES (${customerData.name}, ${customerData.email}, ${customerData.phone_number})
      RETURNING *
    `;

    return result[0];
  } catch (error) {
    console.error("Error creating customer:", error);
    throw error;
  }
}

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
        ${orderData.is_email_checkout || false}, ${orderData.is_wa_checkout || false},
        ${orderData.unique_code}, ${orderData.proof_transfer}
      )
      RETURNING *
    `;

    return result[0];
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
}

export async function createOrderItems(orderItems: any[]) {
  try {
    const results = [];

    for (const item of orderItems) {
      const result = await sql`
        INSERT INTO order_items (order_id, ticket_type_id, quantity, price_per_ticket, effective_ticket_count)
        VALUES (${item.order_id}, ${item.ticket_type_id}, ${item.quantity}, ${item.price_per_ticket}, ${item.effective_ticket_count})
        RETURNING *
      `;
      results.push(result[0]);
    }

    return results;
  } catch (error) {
    console.error("Error creating order items:", error);
    throw error;
  }
}

export async function getOrderWithDetails(orderReference: string) {
  try {
    // Try cache first
    const cacheKey = `order:${orderReference}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached && typeof cached === "string") {
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.log("Cache error for order:", cacheError);
    }

    const result = await sql`
      SELECT
        o.*,
        row_to_json(c.*) as customer,
        row_to_json(e.*) as event,
        row_to_json(pc.*) as payment_channel,
        row_to_json(d.*) as discount,
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
        ) as order_items,
        COALESCE(
          (SELECT json_agg(row_to_json(t.*)) FROM tickets t WHERE t.order_id = o.id),
          '[]'::json
        ) as tickets,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', oia.id,
              'order_item_id', oia.order_item_id,
              'attendee_name', oia.attendee_name,
              'attendee_email', oia.attendee_email,
              'attendee_phone_number', oia.attendee_phone_number,
              'custom_answers', oia.custom_answers,
              'barcode_id', oia.barcode_id,
              'created_at', oia.created_at
            )
          ) FROM order_item_attendees oia 
          JOIN order_items oi ON oia.order_item_id = oi.id 
          WHERE oi.order_id = o.id),
          '[]'::json
        ) as attendees
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN events e ON o.event_id = e.id
      LEFT JOIN payment_channels pc ON o.payment_channel_id = pc.id
      LEFT JOIN discounts d ON o.discount_id = d.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN ticket_types tt ON oi.ticket_type_id = tt.id
      WHERE o.order_reference = ${orderReference}
      GROUP BY o.id, c.*, e.*, pc.*, d.*
    `;

    const order = result[0] || null;

    // Cache for 30 minutes
    if (order) {
      try {
        await redis.setex(cacheKey, 1800, JSON.stringify(order));
      } catch (cacheError) {
        console.log("Failed to cache order:", cacheError);
      }
    }

    return order;
  } catch (error) {
    console.error("Error fetching order:", error);
    return null;
  }
}

export async function updateOrderStatus(
  orderReference: string,
  status: string,
  paidAt?: string,
) {
  try {
    const result = await sql`
      UPDATE orders
      SET status = ${status},
          updated_at = ${new Date().toISOString()}
          ${paidAt ? sql`, paid_at = ${paidAt}` : sql``}
      WHERE order_reference = ${orderReference}
      RETURNING *
    `;

    // Clear cache
    try {
      await redis.del(`order:${orderReference}`);
    } catch (cacheError) {
      console.log("Failed to clear order cache:", cacheError);
    }

    return result[0];
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
}

export async function createPaymentLog(logData: {
  order_reference: string;
  log_type: string;
  request_payload?: any;
  response_payload?: any;
  virtual_account_number?: string | null;
}) {
  try {
    console.log("Creating payment log with data:", logData);

    const result = await sql`
      INSERT INTO payment_logs (
        order_reference, log_type, request_payload, response_payload,
        virtual_account_number, created_at
      ) VALUES (
        ${logData.order_reference},
        ${logData.log_type},
        ${logData.request_payload ? JSON.stringify(logData.request_payload) : null},
        ${logData.response_payload ? JSON.stringify(logData.response_payload) : null},
        ${logData.virtual_account_number},
        ${new Date().toISOString()}
      )
      RETURNING *
    `;

    return result[0];
  } catch (error) {
    console.error("Error creating payment log:", error);
    throw error;
  }
}

// New functions for custom fields
export async function getEventCustomFields(eventId: number) {
  try {
    const cacheKey = `custom_fields:${eventId}`;
    
    // Try cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached && typeof cached === "string") {
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.log("Cache error for custom fields:", cacheError);
    }

    const result = await sql`
      SELECT 
        ecf.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ecfo.id,
              'value', ecfo.option_value,
              'label', ecfo.option_label,
              'sort_order', ecfo.sort_order
            ) ORDER BY ecfo.sort_order
          ) FILTER (WHERE ecfo.id IS NOT NULL),
          '[]'::json
        ) as options
      FROM event_custom_fields ecf
      LEFT JOIN event_custom_field_options ecfo ON ecf.id = ecfo.custom_field_id
      WHERE ecf.event_id = ${eventId}
      GROUP BY ecf.id
      ORDER BY ecf.sort_order ASC
    `;

    // Cache for 30 minutes
    if (result) {
      try {
        await redis.setex(cacheKey, 1800, JSON.stringify(result));
      } catch (cacheError) {
        console.log("Failed to cache custom fields:", cacheError);
      }
    }

    return result || [];
  } catch (error) {
    console.error("Error fetching custom fields:", error);
    return [];
  }
}

export async function createOrderItemAttendees(attendeesData: any[]) {
  try {
    const results = [];

    for (const attendee of attendeesData) {
      const result = await sql`
        INSERT INTO order_item_attendees (
          order_item_id, attendee_name, attendee_email, 
          attendee_phone_number, custom_answers, barcode_id
        ) VALUES (
          ${attendee.order_item_id}, ${attendee.attendee_name}, ${attendee.attendee_email},
          ${attendee.attendee_phone_number}, ${JSON.stringify(attendee.custom_answers || {})}, ${attendee.barcode_id}
        )
        RETURNING *
      `;
      results.push(result[0]);
    }

    return results;
  } catch (error) {
    console.error("Error creating order item attendees:", error);
    throw error;
  }
}

export async function getOrderItemAttendees(orderItemId: number) {
  try {
    const result = await sql`
      SELECT * FROM order_item_attendees
      WHERE order_item_id = ${orderItemId}
      ORDER BY id ASC
    `;

    return result || [];
  } catch (error) {
    console.error("Error fetching order item attendees:", error);
    return [];
  }
}
