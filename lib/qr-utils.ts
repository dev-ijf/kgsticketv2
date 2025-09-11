import QRCode from "qrcode"

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
    return qrCodeDataURL
  } catch (error) {
    throw new Error("Failed to generate QR code")
  }
}

export async function generateQRBuffer(data: string): Promise<Buffer> {
  try {
    const buffer = await QRCode.toBuffer(data, {
      width: 200,
      margin: 2,
    })
    return buffer
  } catch (error) {
    throw new Error("Failed to generate QR code buffer")
  }
}
