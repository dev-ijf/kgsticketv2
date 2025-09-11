import { generateFaspaySignature } from "./faspay-utils"

export function getIndonesiaDateTime() {
  // Get current time in Indonesia timezone (UTC+7)
  const now = new Date()
  const indonesiaTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return indonesiaTime.toISOString().slice(0, 19).replace("T", " ")
}

export function getIndonesiaExpiryDateTime() {
  // Get expiry time (5 hours 4 minutes from now) in Indonesia timezone
  const now = new Date()
  const expiryTime = new Date(now.getTime() + 7 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000 + 4 * 60 * 1000)
  return expiryTime.toISOString().slice(0, 19).replace("T", " ")
}

export interface FaspayPaymentRequest {
  orderReference: string
  customerName: string
  customerEmail: string
  paymentChannel: string
  finalAmount: number
}

export async function createFaspayPayment(paymentData: FaspayPaymentRequest) {
  const { orderReference, customerName, customerEmail, paymentChannel, finalAmount } = paymentData

  try {
    const billDate = getIndonesiaDateTime()
    const billExpired = getIndonesiaExpiryDateTime()
    const signature = generateFaspaySignature(orderReference)

    const requestPayload = {
      request: "Post Data Transaction",
      merchant_id: process.env.FASPAY_MERCHANT_ID || "35802",
      merchant: process.env.FASPAY_MERCHANT || "Indonesia Juara",
      bill_no: orderReference,
      bill_reff: orderReference,
      bill_date: billDate,
      bill_expired: billExpired,
      bill_desc: "Payment Online Via Faspay",
      bill_currency: "IDR",
      bill_total: finalAmount.toString(),
      cust_no: orderReference,
      cust_name: customerName,
      payment_channel: paymentChannel,
      pay_type: "01",
      msisdn: "8562927907",
      email: customerEmail,
      terminal: "10",
      billing_name: "CNT",
      billing_lastname: "0",
      billing_address: "Summarecon Bandung, Magna Commercial Blok MC 65",
      billing_address_city: "Bandung",
      billing_address_region: "Jawa Barat",
      billing_address_state: "Indonesia",
      billing_address_poscode: "40295",
      billing_msisdn: "",
      billing_address_country_code: "ID",
      receiver_name_for_shipping: customerName,
      shipping_lastname: "",
      shipping_address: "Summarecon Bandung, Magna Commercial Blok MC 65",
      shipping_address_city: "Bandung",
      shipping_address_region: "Jawa Barat",
      shipping_address_state: "Indonesia",
      shipping_address_poscode: "40295",
      shipping_msisdn: "",
      shipping_address_country_code: "ID",
      item: [
        {
          id: orderReference,
          product: `Invoice ${orderReference}`,
          qty: "1",
          amount: finalAmount.toString(),
          payment_plan: "01",
          merchant_id: process.env.FASPAY_MERCHANT_ID || "35802",
          tenor: "00",
        },
      ],
      reserve1: "",
      reserve2: "",
      signature: signature,
    }

    const faspayUrl = process.env.FASPAY_URL || "https://web.faspay.co.id/cvr/300011/10"

    console.log("Sending request to Faspay:", {
      url: faspayUrl,
      orderReference,
      signature,
      finalAmount,
    })

    const response = await fetch(faspayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestPayload),
    })

    let responseData
    const responseText = await response.text()

    try {
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Failed to parse Faspay response as JSON:", responseText)
      responseData = {
        error: "Invalid response format",
        raw_response: responseText,
      }
    }

    // Add signature to response for logging
    responseData.signature = signature

    return {
      success: response.ok,
      data: responseData,
      requestPayload,
      signature,
      httpStatus: response.status,
    }
  } catch (error) {
    console.error("Faspay API Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      requestPayload: null,
      signature: null,
    }
  }
}
