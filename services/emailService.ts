/**
 * services/emailService.ts
 *
 * Transactional email via Resend.
 *
 * Requires:
 *   RESEND_API_KEY  — API key from resend.com
 *   EMAIL_FROM      — e.g. "DANELE <comenzi@danele.ro>"
 *
 * When RESEND_API_KEY is not set, emails are logged (mock mode).
 */

import { Resend } from "resend";

// ─────────────────────────────────────────────
// Resend client (lazy singleton)
// ─────────────────────────────────────────────

let _resend: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!_resend) _resend = new Resend(apiKey);
  return _resend;
}

// ─────────────────────────────────────────────
// Shared email layout
// ─────────────────────────────────────────────

function emailLayout(body: string): string {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#FBF5EF; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FBF5EF; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #C4956A, #A67B5B); padding:32px; text-align:center;">
              <h1 style="margin:0; font-size:28px; font-weight:700; color:#FFFFFF; letter-spacing:3px; font-family:Georgia,'Times New Roman',serif;">
                DANELE
              </h1>
              <p style="margin:4px 0 0; font-size:12px; color:rgba(255,255,255,0.8); letter-spacing:1px;">
                Frumusețe naturală, livrată la tine
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F5EDE4; padding:24px 40px; text-align:center; border-top:1px solid #E8D9C5;">
              <p style="margin:0 0 8px; font-size:13px; color:#A67B5B;">
                Ai nevoie de ajutor? Contactează-ne:
              </p>
              <p style="margin:0 0 4px; font-size:13px; color:#6B5E50;">
                <a href="tel:+40732468044" style="color:#A67B5B; text-decoration:none;">+40 732 468 044</a>
              </p>
              <p style="margin:12px 0 0; font-size:11px; color:#B0A090;">
                Program: Luni – Vineri, 12:00 – 20:00
              </p>
              <p style="margin:8px 0 0; font-size:11px; color:#C4B8A8;">
                &copy; ${new Date().getFullYear()} S &amp; D BEAUTY HUB SRL &bull; CUI 52693872
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// Internal send
// ─────────────────────────────────────────────

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: MailOptions): Promise<void> {
  const resend = getResend();

  if (!resend) {
    console.log("[EmailService] (MOCK — no RESEND_API_KEY) Would send:", {
      to: options.to,
      subject: options.subject,
    });
    return;
  }

  const from = process.env.EMAIL_FROM ?? "DANELE <comenzi@danele.ro>";

  const { error } = await resend.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (error) {
    console.error("[EmailService] Resend error:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  console.log("[EmailService] Sent to", options.to, "—", options.subject);
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Order confirmation — sent right after checkout
 */
export interface OrderEmailData {
  orderNumber: string;
  customerFirstName: string;
  paymentMethod: string;
  items: { productNameSnapshot: string; quantity: number; productPriceSnapshot: number | string; lineTotal: number | string }[];
  subtotal: number | string;
  shippingCost: number | string;
  total: number | string;
}

export async function sendOrderConfirmationEmail(
  to: string,
  order: OrderEmailData
): Promise<void> {
  const itemsHtml = order.items.map((item) => `
    <tr>
      <td style="padding:8px 12px; border-bottom:1px solid #F0E6DC; color:#5C4A3A; font-size:14px;">
        ${item.productNameSnapshot}
      </td>
      <td style="padding:8px 12px; border-bottom:1px solid #F0E6DC; color:#6B5E50; font-size:14px; text-align:center;">
        ${item.quantity}
      </td>
      <td style="padding:8px 12px; border-bottom:1px solid #F0E6DC; color:#5C4A3A; font-size:14px; text-align:right; white-space:nowrap;">
        ${Number(item.lineTotal).toFixed(2)} RON
      </td>
    </tr>
  `).join("");

  const paymentLabel = order.paymentMethod === "RAMBURS" ? "Ramburs (plata la livrare)" : "Card online";

  const body = `
    <h2 style="margin:0 0 16px; color:#5C4A3A; font-size:22px;">Comanda ta a fost primită!</h2>
    <p style="color:#6B5E50; font-size:15px; line-height:1.6;">
      Salut ${order.customerFirstName}, mulțumim pentru comanda ta! Am primit-o și o procesăm în cel mai scurt timp.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0; background-color:#FBF5EF; border-radius:12px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px; font-size:13px; color:#A67B5B; text-transform:uppercase; letter-spacing:1px;">Număr comandă</p>
          <p style="margin:0; font-size:22px; font-weight:700; color:#5C4A3A; letter-spacing:1px;">${order.orderNumber}</p>
        </td>
      </tr>
    </table>

    <h3 style="margin:24px 0 12px; color:#5C4A3A; font-size:16px;">Produse comandate</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FBF5EF; border-radius:12px; overflow:hidden;">
      <thead>
        <tr style="background-color:#E8D9C5;">
          <th style="padding:10px 12px; text-align:left; color:#5C4A3A; font-size:13px; font-weight:600;">Produs</th>
          <th style="padding:10px 12px; text-align:center; color:#5C4A3A; font-size:13px; font-weight:600;">Cant.</th>
          <th style="padding:10px 12px; text-align:right; color:#5C4A3A; font-size:13px; font-weight:600;">Preț</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:8px 12px; color:#6B5E50; font-size:14px; text-align:right;">Subtotal:</td>
          <td style="padding:8px 12px; color:#5C4A3A; font-size:14px; text-align:right; font-weight:600;">${Number(order.subtotal).toFixed(2)} RON</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:8px 12px; color:#6B5E50; font-size:14px; text-align:right;">Livrare:</td>
          <td style="padding:8px 12px; color:#5C4A3A; font-size:14px; text-align:right;">${Number(order.shippingCost) === 0 ? "GRATUIT" : Number(order.shippingCost).toFixed(2) + " RON"}</td>
        </tr>
        <tr style="background-color:#E8D9C5;">
          <td colspan="2" style="padding:12px; color:#5C4A3A; font-size:16px; text-align:right; font-weight:700;">Total:</td>
          <td style="padding:12px; color:#5C4A3A; font-size:16px; text-align:right; font-weight:700;">${Number(order.total).toFixed(2)} RON</td>
        </tr>
      </tfoot>
    </table>

    <p style="margin:16px 0 0; color:#6B5E50; font-size:14px; line-height:1.6;">
      <strong>Metodă de plată:</strong> ${paymentLabel}
    </p>
    <p style="color:#6B5E50; font-size:14px; line-height:1.6;">
      Vei primi o notificare când comanda este expediată.
    </p>
    <p style="color:#6B5E50; font-size:14px; line-height:1.6;">
      Dacă ai întrebări, contactează-ne la <a href="tel:+40732468044" style="color:#C4956A;">+40 732 468 044</a>.
    </p>
    <p style="margin:24px 0 0; color:#A67B5B; font-size:14px;">
      Cu drag,<br/><strong>Echipa DANELE</strong>
    </p>
  `;

  await sendEmail({
    to,
    subject: `Comanda ${order.orderNumber} a fost primită — DANELE`,
    html: emailLayout(body),
  });
}

/**
 * Payment confirmed (IPN callback for card payments)
 */
export async function sendPaymentConfirmationEmail(
  to: string,
  orderNumber: string
): Promise<void> {
  const body = `
    <h2 style="margin:0 0 16px; color:#5C4A3A; font-size:22px;">Plata confirmată!</h2>
    <p style="color:#6B5E50; font-size:15px; line-height:1.6;">
      Plata pentru comanda ta a fost procesată cu succes.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0; background-color:#E8F5E9; border-radius:12px;">
      <tr>
        <td style="padding:16px 20px; text-align:center;">
          <p style="margin:0 0 4px; font-size:28px;">&#10003;</p>
          <p style="margin:0 0 4px; font-size:13px; color:#2E7D32; text-transform:uppercase; letter-spacing:1px;">Plată confirmată</p>
          <p style="margin:0; font-size:18px; font-weight:700; color:#1B5E20;">${orderNumber}</p>
        </td>
      </tr>
    </table>
    <p style="color:#6B5E50; font-size:14px; line-height:1.6;">
      Vom pregăti comanda ta și o vom expedia în cel mai scurt timp posibil.
    </p>
    <p style="margin:24px 0 0; color:#A67B5B; font-size:14px;">
      Cu drag,<br/><strong>Echipa DANELE</strong>
    </p>
  `;

  await sendEmail({
    to,
    subject: `Plata confirmată pentru comanda ${orderNumber} — DANELE`,
    html: emailLayout(body),
  });
}

/**
 * Order status changed (admin action)
 */
export async function sendOrderStatusUpdatedEmail(
  to: string,
  orderNumber: string,
  newStatus: string
): Promise<void> {
  const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
    new:        { label: "Nouă",         color: "#1976D2", icon: "&#128230;" },
    paid:       { label: "Plătită",      color: "#2E7D32", icon: "&#10003;"  },
    processing: { label: "În procesare", color: "#F57C00", icon: "&#9881;"   },
    shipped:    { label: "Expediată",    color: "#7B1FA2", icon: "&#128666;" },
    delivered:  { label: "Livrată",      color: "#2E7D32", icon: "&#127881;" },
    cancelled:  { label: "Anulată",      color: "#C62828", icon: "&#10007;"  },
  };

  const status = statusLabels[newStatus] ?? {
    label: newStatus,
    color: "#6B5E50",
    icon: "&#8505;",
  };

  const body = `
    <h2 style="margin:0 0 16px; color:#5C4A3A; font-size:22px;">Actualizare comandă</h2>
    <p style="color:#6B5E50; font-size:15px; line-height:1.6;">
      Statusul comenzii tale a fost actualizat.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0; background-color:#FBF5EF; border-radius:12px;">
      <tr>
        <td style="padding:20px; text-align:center;">
          <p style="margin:0 0 8px; font-size:32px;">${status.icon}</p>
          <p style="margin:0 0 4px; font-size:13px; color:#A67B5B; letter-spacing:1px;">COMANDA ${orderNumber}</p>
          <p style="margin:0; font-size:20px; font-weight:700; color:${status.color};">${status.label}</p>
        </td>
      </tr>
    </table>
    ${newStatus === "shipped" ? `
    <p style="color:#6B5E50; font-size:14px; line-height:1.6;">
      Coletul tău este pe drum! Vei primi un SMS de la curier cu detaliile de livrare.
    </p>` : ""}
    ${newStatus === "cancelled" ? `
    <p style="color:#6B5E50; font-size:14px; line-height:1.6;">
      Dacă crezi că e o eroare sau ai întrebări, contactează-ne.
    </p>` : ""}
    <p style="margin:24px 0 0; color:#A67B5B; font-size:14px;">
      Cu drag,<br/><strong>Echipa DANELE</strong>
    </p>
  `;

  await sendEmail({
    to,
    subject: `Comanda ${orderNumber}: ${status.label} — DANELE`,
    html: emailLayout(body),
  });
}
