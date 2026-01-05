import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
  // Performance optimizations
  retry: {
    retries: 3,
    delay: (attempt) => Math.min(attempt * 50, 500),
  },
  // Connection timeout
  timeout: 10000,
})

export async function cacheOrder(orderReference: string, orderData: any, ttl = 3600) {
  await redis.setex(`order:${orderReference}`, ttl, JSON.stringify(orderData))
}

export async function getCachedOrder(orderReference: string) {
  const cached = await redis.get(`order:${orderReference}`)
  return cached ? JSON.parse(cached as string) : null
}

export async function deleteOrderCache(orderReference: string) {
  await redis.del(`order:${orderReference}`)
}

export async function cachePaymentStatus(orderReference: string, status: string, ttl = 1800) {
  await redis.setex(`payment:${orderReference}`, ttl, status)
}

export async function getCachedPaymentStatus(orderReference: string) {
  return await redis.get(`payment:${orderReference}`)
}
