import { BRAND } from "@/config/site";
import { unsubscribeToken } from "./token";

/**
 * src/lib/campaigns/mail.ts
 *
 * Arma y envía los correos de una campaña.
 *
 * LO QUE ESTE ARCHIVO GARANTIZA, PASE LO QUE PASE:
 *
 *   - Todo correo lleva enlace de baja y dirección postal del negocio.
 *     No es opcional ni configurable desde el panel: la ley de EE. UU.
 *     (CAN-SPAM) exige ambas cosas en cada envío comercial, y una casilla
 *     que alguien pueda desmarcar un martes por la tarde es una multa
 *     esperando.
 *   - El motivo de consulta no viaja nunca en el asunto. Quien escribe la
 *     campaña pone el asunto, pero el sistema no añade por su cuenta
 *     ningún dato de salud, y el manual avisa de que no lo haga.
 *   - Cada correo va dirigido a UNA persona. Nada de copias ocultas con
 *     doscientas direcciones: basta un reenvío para que la lista entera
 *     quede expuesta.
 */

const BATCH_API = "https://api.resend.com/emails/batch";

/** Resend acepta hasta 100 por petición; 50 deja margen. */
export const MAX_BATCH = 50;

export interface Recipient {
  readonly email: string;
  readonly name: string;
}

export interface CampaignContent {
  readonly subject: string;
  /** Texto plano escrito por el equipo. Los saltos de línea se respetan. */
  readonly body: string;
  /** Segundo idioma, opcional, debajo de una línea separadora. */
  readonly bodyAlt: string | null;
  /** Etiqueta del descuento, si la campaña va unida a una promoción. */
  readonly discount: string | null;
  /** Enlace del botón. Lleva el ?promo= cuando hay promoción. */
  readonly ctaUrl: string;
  readonly ctaLabel: string;
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tusojoseyecare.com").replace(/\/$/, "");
}

export function appointmentUrl(promoSlug: string | null): string {
  const base = `${siteUrl()}/es/cita`;
  return promoSlug ? `${base}?promo=${encodeURIComponent(promoSlug)}` : base;
}

/** Escapa lo que vaya a parar al HTML del correo. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function postalLine(): string {
  const c = BRAND.corporate;
  return `${c.legalEntity} · ${c.addressLine1}, ${c.city}, ${c.state} ${c.postalCode}`;
}

function paragraphs(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function renderEmail(c: CampaignContent, to: Recipient): { html: string; text: string } {
  const unsubUrl = `${siteUrl()}/unsubscribe?t=${unsubscribeToken(to.email)}`;
  const greeting = to.name.split(" ")[0] ?? "";

  const text = [
    greeting ? `Hola ${greeting},` : "Hola,",
    "",
    c.body,
    ...(c.discount ? ["", `Tu descuento: ${c.discount}`] : []),
    "",
    `${c.ctaLabel}: ${c.ctaUrl}`,
    ...(c.bodyAlt ? ["", "— — —", "", c.bodyAlt] : []),
    "",
    "——————————",
    postalLine(),
    `Si no quieres recibir más correos nuestros, date de baja aquí: ${unsubUrl}`,
  ].join("\n");

  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f5f7f6">
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:28px 20px;color:#1a1f1e;line-height:1.6">
  <p style="font-weight:800;color:#800080;font-size:20px;margin:0 0 24px">${esc(BRAND.name)}</p>

  <p style="margin:0 0 16px">Hola${greeting ? ` ${esc(greeting)}` : ""},</p>
  ${paragraphs(c.body)}

  ${
    c.discount
      ? `<p style="background:#f6e8f6;color:#800080;font-weight:700;padding:14px 18px;border-radius:12px;margin:0 0 20px">${esc(c.discount)}</p>`
      : ""
  }

  <p style="margin:24px 0">
    <a href="${esc(c.ctaUrl)}" style="background:#800080;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-weight:bold;display:inline-block">${esc(c.ctaLabel)}</a>
  </p>

  ${
    c.bodyAlt
      ? `<hr style="border:0;border-top:1px solid #e1e7e5;margin:28px 0">${paragraphs(c.bodyAlt)}`
      : ""
  }

  <div style="border-top:1px solid #e1e7e5;margin-top:32px;padding-top:16px;color:#55605d;font-size:12px;line-height:1.7">
    <p style="margin:0 0 6px">${esc(postalLine())}</p>
    <p style="margin:0">
      Recibes este correo porque pediste cita con nosotros.
      <a href="${esc(unsubUrl)}" style="color:#55605d">Darse de baja</a>.
    </p>
  </div>
</div></body></html>`;

  return { html, text };
}

export interface SendResult {
  readonly email: string;
  readonly ok: boolean;
  readonly providerId: string | null;
  readonly error: string | null;
}

/**
 * Envía una tanda. Devuelve el resultado de CADA dirección, también las
 * que fallaron: quien no recibió tiene que poder reintentarse sin que a
 * los demás les llegue dos veces.
 */
export async function sendBatch(
  content: CampaignContent,
  people: readonly Recipient[],
): Promise<SendResult[]> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.CAMPAIGN_FROM_EMAIL ?? process.env.NOTIFY_FROM_EMAIL;

  if (!key || !from) {
    return people.map((p) => ({
      email: p.email,
      ok: false,
      providerId: null,
      error: "Correo no configurado (falta RESEND_API_KEY o la dirección de envío)",
    }));
  }

  const payload = people.map((p) => {
    const { html, text } = renderEmail(content, p);
    return {
      from,
      to: [p.email],
      reply_to: BRAND.email,
      subject: content.subject,
      html,
      text,
    };
  });

  try {
    const res = await fetch(BATCH_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    if (!res.ok) {
      return people.map((p) => ({
        email: p.email,
        ok: false,
        providerId: null,
        error: `${res.status}: ${raw.slice(0, 180)}`,
      }));
    }

    // Resend devuelve { data: [{ id }, ...] } en el mismo orden.
    const ids = (JSON.parse(raw) as { data?: { id?: string }[] }).data ?? [];
    return people.map((p, i) => ({
      email: p.email,
      ok: true,
      providerId: ids[i]?.id ?? null,
      error: null,
    }));
  } catch (err) {
    return people.map((p) => ({
      email: p.email,
      ok: false,
      providerId: null,
      error: err instanceof Error ? err.message.slice(0, 180) : "error de red",
    }));
  }
}
