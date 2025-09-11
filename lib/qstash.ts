import { Client } from "@upstash/qstash"

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
})

export async function schedulePaymentCheck(orderReference: string, delayInSeconds = 300) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

  await qstash.publishJSON({
    url: `${baseUrl}/api/webhooks/payment-check`,
    delay: delayInSeconds,
    body: {
      orderReference,
      action: "check_payment_status",
    },
  })
}

export async function scheduleNotification(
  orderReference: string,
  type: "email" | "whatsapp",
  delayInSeconds = 0,
  extraPayload: Record<string, any> = {},
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

  await qstash.publishJSON({
    url: `${baseUrl}/api/webhooks/notifications`,
    delay: delayInSeconds,
    body: {
      orderReference,
      type,
      action: "send_notification",
      ...extraPayload,
    },
  })
}
