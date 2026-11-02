/**
 * Transactional email. Uses the Resend HTTP API when RESEND_API_KEY is set,
 * otherwise logs the link to the server console (development convenience).
 */

const appUrl = () => process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

async function sendViaRestend(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Eron <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function baseTemplate(title: string, body: string, cta: string, url: string): string {
  return `
  <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;font-weight:700">${title}</h1>
    <p style="color:#555;line-height:1.6">${body}</p>
    <a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;margin-top:8px">${cta}</a>
    <p style="color:#999;font-size:12px;margin-top:24px">Link berlaku 1 jam. Jika kamu tidak merasa meminta ini, abaikan email ini.</p>
  </div>`;
}

export async function sendEmailVerification(to: string, token: string): Promise<boolean> {
  const url = `${appUrl()}/api/verify-email?token=${token}`;
  const sent = await sendViaRestend(
    to,
    "Verifikasi email akun Eron",
    baseTemplate(
      "Verifikasi email kamu",
      "Klik tombol di bawah untuk mengaktifkan verifikasi email akun Eron kamu.",
      "Verifikasi Email",
      url,
    ),
  );
  if (!sent) console.info(`[mail] Email verification link for ${to}: ${url}`);
  return sent;
}

export async function sendPasswordReset(to: string, token: string): Promise<boolean> {
  const url = `${appUrl()}/reset-password?token=${token}`;
  const sent = await sendViaRestend(
    to,
    "Reset password akun Eron",
    baseTemplate(
      "Reset password",
      "Klik tombol di bawah untuk membuat password baru. Tidak meminta ini? Abaikan email.",
      "Reset Password",
      url,
    ),
  );
  if (!sent) console.info(`[mail] Password reset link for ${to}: ${url}`);
  return sent;
}
