-- Create function to increment discount usage count
CREATE OR REPLACE FUNCTION increment_discount_usage(discount_id bigint)
RETURNS void AS $$
BEGIN
  UPDATE discounts 
  SET usage_count = COALESCE(usage_count, 0) + 1,
      updated_at = now()
  WHERE id = discount_id;
END;
$$ LANGUAGE plpgsql;
