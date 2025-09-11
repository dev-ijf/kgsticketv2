-- Seed notification templates
INSERT INTO notification_templates (id, name, channel, trigger_on, subject, body, is_active) VALUES
(1, 'Email Checkout', 'email', 'checkout', 'Konfirmasi Pemesanan Tiket - {{event.name}}', 
'<h2>Terima kasih atas pemesanan Anda!</h2>
<p>Halo {{customer.name}},</p>
<p>Pemesanan tiket Anda untuk event <strong>{{event.name}}</strong> telah berhasil dibuat.</p>
<p><strong>Detail Pemesanan:</strong></p>
<ul>
<li>Nomor Order: {{order.order_reference}}</li>
<li>Total Pembayaran: {{order.final_amount}}</li>
<li>Metode Pembayaran: {{payment_channel.pg_name}}</li>
<li>Virtual Account: {{virtual_account_number}}</li>
</ul>
<p>Silakan lakukan pembayaran sebelum {{payment_deadline}}</p>
<p>Link pembayaran: <a href="{{payment_response_url}}">Bayar Sekarang</a></p>', true),

(2, 'WhatsApp Checkout', 'whatsapp', 'checkout', NULL,
'🎫 *Konfirmasi Pemesanan Tiket*

Halo {{customer.name}},

Pemesanan tiket Anda untuk event *{{event.name}}* telah berhasil dibuat.

📋 *Detail Pemesanan:*
• Nomor Order: {{order.order_reference}}
• Total Pembayaran: {{order.final_amount}}
• Metode Pembayaran: {{payment_channel.pg_name}}
• Virtual Account: {{virtual_account_number}}

⏰ Batas Waktu Pembayaran: {{payment_deadline}}

💳 Link Pembayaran: {{payment_response_url}}

Terima kasih!', true),

(3, 'Email Paid', 'email', 'paid', 'Pembayaran Berhasil - Tiket {{event.name}}',
'<h2>Pembayaran Berhasil!</h2>
<p>Halo {{customer.name}},</p>
<p>Pembayaran untuk tiket event <strong>{{event.name}}</strong> telah berhasil dikonfirmasi.</p>
<p>Anda dapat mengunduh tiket Anda melalui link berikut:</p>
<p><a href="{{ticket_link}}">Download Tiket</a></p>
<p>Terima kasih dan sampai jumpa di event!</p>', true),

(4, 'WhatsApp Paid', 'whatsapp', 'paid', NULL,
'✅ *Pembayaran Berhasil!*

Halo {{customer.name}},

Pembayaran untuk tiket event *{{event.name}}* telah berhasil dikonfirmasi.

🎫 Download tiket Anda di: {{ticket_link}}

Terima kasih dan sampai jumpa di event! 🎉', true)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  channel = EXCLUDED.channel,
  trigger_on = EXCLUDED.trigger_on,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  is_active = EXCLUDED.is_active,
  updated_at = now();
