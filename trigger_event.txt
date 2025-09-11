CREATE OR REPLACE FUNCTION public.auto_generate_slug()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from name
  base_slug := generate_slug(NEW.name);
  final_slug := base_slug;
  
  -- Check if slug already exists and append number if needed
  WHILE EXISTS (SELECT 1 FROM events WHERE slug = final_slug AND id != COALESCE(NEW.id, 0)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.calculate_effective_ticket_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Calculate the effective number of tickets based on ticket type
  NEW.effective_ticket_count = NEW.quantity * 
    (SELECT tickets_per_purchase FROM ticket_types WHERE id = NEW.ticket_type_id);
  
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.create_tickets_for_paid_order(p_order_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  ticket_item RECORD;
BEGIN
  -- Verify the order is in 'paid' status before creating tickets
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id = p_order_id AND status = 'paid') THEN
    RAISE EXCEPTION 'Cannot create tickets for an order that is not paid';
  END IF;

  -- Loop through order items for this specific order
  FOR ticket_item IN 
    SELECT 
      oi.ticket_type_id, 
      oi.quantity,
      oi.effective_ticket_count,
      o.customer_id,
      c.name AS attendee_name,
      c.email AS attendee_email,
      tt.tickets_per_purchase
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN customers c ON o.customer_id = c.id
    JOIN ticket_types tt ON oi.ticket_type_id = tt.id
    WHERE oi.order_id = p_order_id
  LOOP
    -- Create tickets for each order item, respecting tickets_per_purchase
    INSERT INTO tickets (
      order_id, 
      ticket_type_id, 
      ticket_code, 
      attendee_name, 
      attendee_email
    )
    SELECT 
      p_order_id,
      ticket_item.ticket_type_id,
      generate_random_string(8),
      ticket_item.attendee_name,
      ticket_item.attendee_email
    FROM generate_series(1, ticket_item.effective_ticket_count);

    -- Update ticket_types quantity_sold
    UPDATE ticket_types
    SET quantity_sold = quantity_sold + ticket_item.effective_ticket_count
    WHERE id = ticket_item.ticket_type_id;
  END LOOP;
END;
$function$

CREATE OR REPLACE FUNCTION public.create_tickets_on_paid_order()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  ticket_item RECORD;
BEGIN
  -- Only proceed if the order status is changing to 'paid'
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
    -- Loop through order items for this specific order
    FOR ticket_item IN 
      SELECT 
        oi.ticket_type_id, 
        oi.quantity,
        c.name AS attendee_name,
        c.email AS attendee_email
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      WHERE oi.order_id = NEW.id
    LOOP
      -- Create tickets for each order item
      INSERT INTO tickets (
        order_id, 
        ticket_type_id, 
        ticket_code, 
        attendee_name, 
        attendee_email
      )
      SELECT 
        NEW.id,
        ticket_item.ticket_type_id,
        generate_random_string(8),
        ticket_item.attendee_name,
        ticket_item.attendee_email
      FROM generate_series(1, ticket_item.quantity);

      -- Update ticket_types quantity_sold
      UPDATE ticket_types
      SET quantity_sold = quantity_sold + ticket_item.quantity
      WHERE id = ticket_item.ticket_type_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.generate_random_string(length integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  chars TEXT[] := '{A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  IF length < 1 THEN
    RAISE EXCEPTION 'Given length must be at least 1';
  END IF;
  FOR i IN 1..length LOOP
    result := result || chars[1+floor(random()*(array_length(chars, 1)))::int];
  END LOOP;
  RETURN result;
END;
$function$

CREATE OR REPLACE FUNCTION public.generate_slug(input_text text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(input_text, '[^a-zA-Z0-9\s]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '^-+|-+$', '', 'g'
    )
  );
END;
$function$

CREATE OR REPLACE FUNCTION public.handle_order_items_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.increment_ticket_type_sold(ticket_type_id bigint, increment_by integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  update ticket_types
  set quantity_sold = quantity_sold + increment_by
  where id = ticket_type_id;
end;
$function$

CREATE OR REPLACE FUNCTION public.update_ticket_type_quantity_sold_aggregate()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  update ticket_types t
  set quantity_sold = coalesce(agg.sold, 0)
  from (
    select
      oi.ticket_type_id,
      sum(oi.effective_ticket_count) as sold
    from order_items oi
    join orders o on oi.order_id = o.id
    where o.status = 'paid'
    group by oi.ticket_type_id
  ) agg
  where t.id = agg.ticket_type_id;
end;
$function$
