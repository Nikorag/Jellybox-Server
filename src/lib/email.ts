import { Resend } from 'resend'
import { APP_NAME } from '@/lib/constants'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.EMAIL_FROM ?? `${APP_NAME} <noreply@jellybox.app>`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/** Send an email verification link to a newly registered user. */
export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const url = `${APP_URL}/auth/verify-email?token=${token}`
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Verify your ${APP_NAME} account`,
    html: buildEmailHtml(
      'Verify your email address',
      `Click the button below to verify your email address and activate your ${APP_NAME} account.
       The link expires in 24 hours.`,
      url,
      'Verify Email',
    ),
  })
}

/** Send a password reset link. */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const url = `${APP_URL}/auth/reset-password?token=${token}`
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html: buildEmailHtml(
      'Reset your password',
      `You requested a password reset for your ${APP_NAME} account.
       Click the button below to set a new password. The link expires in 1 hour.
       If you did not request this, you can safely ignore this email.`,
      url,
      'Reset Password',
    ),
  })
}

function buildEmailHtml(
  heading: string,
  body: string,
  ctaUrl: string,
  ctaLabel: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#101010;font-family:ui-sans-serif,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#101010;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1c1c1c;border-radius:8px;border:1px solid #333;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#AA5CC3;">${APP_NAME}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#ffffff;">${heading}</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#aaaaaa;line-height:1.6;">${body}</p>
              <a href="${ctaUrl}"
                 style="display:inline-block;padding:12px 28px;background:#AA5CC3;color:#ffffff;
                        font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                ${ctaLabel}
              </a>
              <p style="margin:24px 0 0;font-size:13px;color:#666;">
                Or copy this link: <a href="${ctaUrl}" style="color:#AA5CC3;">${ctaUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 32px;border-top:1px solid #333;">
              <p style="margin:0;font-size:12px;color:#555;text-align:center;">
                © ${new Date().getFullYear()} ${APP_NAME}. If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
