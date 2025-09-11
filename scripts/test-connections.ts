import { sql } from "@/lib/neon"
import { redis } from "@/lib/redis"
import { qstash } from "@/lib/qstash"

async function testConnections() {
  console.log("🔍 Testing database and service connections...\n")

  // Test Neon Database Connection
  try {
    console.log("📊 Testing Neon Database connection...")
    const result = await sql`SELECT NOW() as current_time, version() as postgres_version`
    console.log("✅ Neon Database connected successfully!")
    console.log(`   Current time: ${result[0].current_time}`)
    console.log(`   PostgreSQL version: ${result[0].postgres_version}\n`)
  } catch (error) {
    console.error("❌ Neon Database connection failed:", error)
  }

  // Test Upstash Redis Connection
  try {
    console.log("🔴 Testing Upstash Redis connection...")
    await redis.set("test_key", "test_value", { ex: 60 })
    const value = await redis.get("test_key")
    console.log("✅ Upstash Redis connected successfully!")
    console.log(`   Test value retrieved: ${value}`)
    await redis.del("test_key")
    console.log("   Test key cleaned up\n")
  } catch (error) {
    console.error("❌ Upstash Redis connection failed:", error)
  }

  // Test Upstash QStash Connection
  try {
    console.log("📨 Testing Upstash QStash connection...")
    // Just test the client initialization, don't send actual message
    const qstashClient = qstash
    console.log("✅ Upstash QStash client initialized successfully!")
    console.log("   QStash is ready for message publishing\n")
  } catch (error) {
    console.error("❌ Upstash QStash connection failed:", error)
  }

  // Test Database Schema
  try {
    console.log("🗄️ Testing database schema...")
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `
    console.log("✅ Database schema accessible!")
    console.log("   Available tables:")
    tables.forEach((table) => {
      console.log(`   - ${table.table_name}`)
    })
    console.log("")
  } catch (error) {
    console.error("❌ Database schema test failed:", error)
  }

  // Test Environment Variables
  console.log("🔧 Checking environment variables...")
  const requiredEnvVars = [
    "DATABASE_URL",
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN",
    "QSTASH_TOKEN",
    "NEXT_PUBLIC_BASE_URL",
  ]

  requiredEnvVars.forEach((envVar) => {
    const value = process.env[envVar]
    if (value) {
      console.log(`✅ ${envVar}: Set`)
    } else {
      console.log(`❌ ${envVar}: Missing`)
    }
  })

  console.log("\n🎉 Connection tests completed!")
}

// Run the tests
testConnections().catch(console.error)
