import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
  from = 'noreply@kreativaglobal.id',
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  if (!to || !subject || !html) {
    throw new Error('to, subject, dan html wajib diisi');
  }
  return resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}
