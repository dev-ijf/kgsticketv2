import crypto from "crypto"

export interface FaspayPaymentData {
  merchant_id: string
  merchant: string
  bill_no: string
  bill_reff: string
  bill_date: string
  bill_expired: string
  bill_desc: string
  bill_currency: string
  bill_gross: string
  bill_miscfee: string
  bill_total: string
  cust_no: string
  cust_name: string
  payment_channel: string
  pay_type: string
  bank_userid: string
  msisdn: string
  email: string
  terminal: string
  billing_name: string
  billing_lastname: string
  billing_address: string
  billing_address_city: string
  billing_address_region: string
  billing_address_state: string
  billing_address_poscode: string
  billing_address_country_code: string
  receiver_name_for_shipping: string
  shipping_lastname: string
  shipping_address: string
  shipping_address_city: string
  shipping_address_region: string
  shipping_address_state: string
  shipping_address_poscode: string
  shipping_address_country_code: string
  item: Array<{
    product: string
    qty: string
    amount: string
    payment_plan: string
    merchant_type: string
    tenor: string
  }>
}

export function generateFaspaySignature(orderId: string): string {
  const username = process.env.FASPAY_USERNAME || "bot35802"
  const password = process.env.FASPAY_PASSWORD || "lmZajXgA"

  // Create signature string: username + password + orderId
  const signatureString = username + password + orderId

  // Generate MD5 hash first
  const md5Hash = crypto.createHash("md5").update(signatureString).digest("hex")

  // Then generate SHA1 hash of the MD5
  const sha1Hash = crypto.createHash("sha1").update(md5Hash).digest("hex")

  return sha1Hash
}

export function formatFaspayDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ")
}

export function generateBillNo(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `TKT${timestamp}${random}`
}
