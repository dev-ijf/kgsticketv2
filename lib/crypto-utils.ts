import crypto from "crypto"

export function generateSHA1(data: string): string {
  return crypto.createHash("sha1").update(data).digest("hex")
}

export function generateMD5(data: string): string {
  return crypto.createHash("md5").update(data).digest("hex")
}

export function generateRandomString(length = 8): string {
  return crypto.randomBytes(length).toString("hex").substring(0, length).toUpperCase()
}
