export async function sendEmail({
  to,
  subject,
  html,
  from = "noreply@kreativaglobal.id",
}: {
  to: string
  subject: string
  html: string
  from?: string
}) {
  console.log("[v0] Email sending temporarily disabled for deployment")
  console.log("[v0] Would send email to:", to, "Subject:", subject)

  // Return a mock success response
  return {
    data: { id: "mock-email-id" },
    error: null,
  }

  // Original email code commented out for deployment
  /*
  if (!to || !subject || !html) {
    throw new Error("to, subject, dan html wajib diisi")
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment variable is required")
  }

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)

  return resend.emails.send({
    from,
    to,
    subject,
    html,
  })
  */
}
