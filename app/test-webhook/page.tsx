"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function TestWebhookPage() {
  const [response, setResponse] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const testFaspayWebhook = async () => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("bill_no", "TKT1234567890")
      formData.append("bill_reff", "ORDER-TEST-001")
      formData.append("payment_status_code", "2") // Success
      formData.append("payment_channel", "BCA")

      const res = await fetch("/api/webhooks/faspay", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      setResponse(JSON.stringify(data, null, 2))
    } catch (error) {
      setResponse(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testPaymentCheck = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/webhooks/payment-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderReference: "ORDER-TEST-001",
          action: "check_payment_status",
        }),
      })

      const data = await res.json()
      setResponse(JSON.stringify(data, null, 2))
    } catch (error) {
      setResponse(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Webhook Testing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testFaspayWebhook} disabled={loading}>
              Test Faspay Webhook
            </Button>
            <Button onClick={testPaymentCheck} disabled={loading} variant="outline">
              Test Payment Check
            </Button>
          </div>

          {response && (
            <div className="mt-4">
              <Label>Response:</Label>
              <pre className="bg-gray-100 p-4 rounded-md mt-2 overflow-auto">{response}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
