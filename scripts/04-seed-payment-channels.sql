-- Seed payment channels data
INSERT INTO payment_channels (pg_code, pg_name, image_url, is_active, is_redirect, vendor, category, sort_order) VALUES
('bca_va', 'BCA Virtual Account', '/images/payment/bca.png', true, false, 'faspay', 'virtual_account', 1),
('bni_va', 'BNI Virtual Account', '/images/payment/bni.png', true, false, 'faspay', 'virtual_account', 2),
('bri_va', 'BRI Virtual Account', '/images/payment/bri.png', true, false, 'faspay', 'virtual_account', 3),
('mandiri_va', 'Mandiri Virtual Account', '/images/payment/mandiri.png', true, false, 'faspay', 'virtual_account', 4),
('permata_va', 'Permata Virtual Account', '/images/payment/permata.png', true, false, 'faspay', 'virtual_account', 5),
('qris', 'QRIS', '/images/payment/qris.png', true, false, 'faspay', 'qris', 6),
('ovo', 'OVO', '/images/payment/ovo.png', true, false, 'faspay', 'ewallet', 7),
('dana', 'DANA', '/images/payment/dana.png', true, false, 'faspay', 'ewallet', 8),
('gopay', 'GoPay', '/images/payment/gopay.png', true, false, 'faspay', 'ewallet', 9),
('shopeepay', 'ShopeePay', '/images/payment/shopeepay.png', true, false, 'faspay', 'ewallet', 10)
ON CONFLICT (pg_code) DO UPDATE SET
  pg_name = EXCLUDED.pg_name,
  image_url = EXCLUDED.image_url,
  is_active = EXCLUDED.is_active,
  is_redirect = EXCLUDED.is_redirect,
  vendor = EXCLUDED.vendor,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
