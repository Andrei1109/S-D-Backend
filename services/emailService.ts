/**
 * services/emailService.ts
 *
 * Transactional email abstraction.
 *
 * When SMTP_HOST is configured, emails are sent via nodemailer.
 * When not configured, calls are logged only (no-op mock) — useful for
 * development and for getting started before choosing an email provider.
 *
 * To add a real provider later:
 *   1. npm install nodemailer @types/nodemailer
 *   2. Fill in SMTP_* variables in .env.local
 *   3. Replace the mock body of sendEmail() with real nodemailer code (marked TODO:EMAIL).
 *
 * Alternative providers: Resend, Postmark, SendGrid — all work similarly;
 * just swap the transport inside sendEmail().
 */

// ─────────────────────────────────────────────
// Internal transport
// ─────────────────────────────────────────────

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: MailOptions): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;

  if (!smtpHost) {
    // No provider configured — log and return (mock mode)
    console.log("[EmailService] (MOCK) Would send email:", {
      to: options.to,
      subject: options.subject,
    });
    return;
  }

  // TODO:EMAIL — uncomment and install nodemailer when ready:
  //
  // import nodemailer from "nodemailer";
  //
  // const transporter = nodemailer.createTransport({
  //   host: process.env.SMTP_HOST,
  //   port: Number(process.env.SMTP_PORT ?? 587),
  //   auth: {
  //     user: process.env.SMTP_USER,
  //     pass: process.env.SMTP_PASS,
  //   },
  // });
  //
  // await transporter.sendMail({
  //   from: process.env.EMAIL_FROM ?? process.env.SMTP_USER,
  //   to: options.to,
  //   subject: options.subject,
  //   html: options.html,
  // });

  console.log("[EmailService] SMTP_HOST is set but nodemailer is not yet wired up.");
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

export async function sendOrderConfirmationEmail(
  to: string,
  orderNumber: string
): Promise<void> {
  await sendEmail({
    to,
    subject: `Comanda ta ${orderNumber} a fost primită!`,
    html: `
      <h2>Mulțumim pentru comanda ta!</h2>
      <p>Comanda <strong>${orderNumber}</strong> a fost primită și este în procesare.</p>
      <p>Vei primi o altă notificare când comanda este expediată.</p>
    `,
  });
}

export async function sendPaymentConfirmationEmail(
  to: string,
  orderNumber: string
): Promise<void> {
  await sendEmail({
    to,
    subject: `Plata pentru comanda ${orderNumber} a fost confirmată`,
    html: `
      <h2>Plata confirmată!</h2>
      <p>Plata pentru comanda <strong>${orderNumber}</strong> a fost procesată cu succes.</p>
      <p>Vom pregăti comanda ta în cel mai scurt timp.</p>
    `,
  });
}

export async function sendOrderStatusUpdatedEmail(
  to: string,
  orderNumber: string,
  newStatus: string
): Promise<void> {
  const statusLabels: Record<string, string> = {
    new: "Nouă",
    paid: "Plătită",
    processing: "În procesare",
    shipped: "Expediată",
    delivered: "Livrată",
    cancelled: "Anulată",
  };

  const label = statusLabels[newStatus] ?? newStatus;

  await sendEmail({
    to,
    subject: `Actualizare comanda ${orderNumber}: ${label}`,
    html: `
      <h2>Statusul comenzii tale a fost actualizat</h2>
      <p>Comanda <strong>${orderNumber}</strong> are acum statusul: <strong>${label}</strong>.</p>
    `,
  });
}
