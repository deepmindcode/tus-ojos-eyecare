import { LOCATIONS } from "@/config/site";

/**
 * src/lib/notify.ts
 *
 * Avisos internos por correo.
 *
 * La regla que manda aqui: el aviso NO lleva datos del paciente. Ni
 * nombre, ni telefono, ni correo, ni motivo de consulta. Solo dice que
 * hay algo que atender y en que oficina. El correo no es un canal
 * seguro y pasa por servidores que no controlamos; los datos viven en
 * el panel, detras de una sesion.
 *
 * Y nunca rompe una reserva: si el envio falla, se registra en el log y
 * la cita ya quedo guardada. Un aviso perdido es un problema menor; una
 * cita perdida es un paciente perdido.
 */

const API = "https://api.resend.com/emails";

function panelUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tusojoseyecare.com").replace(
    /\/$/,
    "",
  );
  return `${base}/admin`;
}

async function send(subject: string, text: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  const from = process.env.NOTIFY_FROM_EMAIL;

  // Sin configuracion no hay aviso, pero tampoco error: el sitio debe
  // funcionar igual antes de que alguien conecte el correo.
  if (!key || !to || !from) {
    console.warn("[notify] correo no configurado; aviso omitido");
    return;
  }

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text, html }),
    });

    if (!res.ok) {
      console.error("[notify] fallo enviando aviso:", res.status, await res.text());
    }
  } catch (error) {
    console.error("[notify] error de red enviando aviso:", error);
  }
}

export interface AppointmentNotice {
  /** Slug de la sede. */
  readonly locationSlug: string;
  readonly isNewPatient: boolean;
  /** Fecha preferida, si la indico. No identifica a nadie. */
  readonly preferredDate: string | null;
  readonly preferredTime: string | null;
  /** Si llego desde una promocion, para que recepcion lo sepa al llamar. */
  readonly withDiscount: boolean;
}

export async function notifyNewAppointment(notice: AppointmentNotice): Promise<void> {
  const office =
    LOCATIONS.find((l) => l.slug === notice.locationSlug)?.city ?? notice.locationSlug;

  const subject = `Nueva solicitud de cita — ${office}`;

  const bullets: string[] = [
    `Oficina: ${office}`,
    `Paciente: ${notice.isNewPatient ? "nuevo" : "ya atendido antes"}`,
  ];

  if (notice.preferredDate) {
    bullets.push(
      `Prefiere: ${notice.preferredDate}${notice.preferredTime ? ` (${notice.preferredTime})` : ""}`,
    );
  }
  if (notice.withDiscount) {
    bullets.push("Viene de una promoción: hay un descuento anotado");
  }

  const url = panelUrl();

  const text = [
    `Entró una solicitud de cita en ${office}.`,
    "",
    ...bullets.map((b) => `- ${b}`),
    "",
    `Los datos de contacto están en el panel: ${url}`,
    "",
    "Este aviso no incluye el nombre ni el teléfono del paciente a propósito.",
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px">
      <h2 style="color:#800080;margin:0 0 4px">Nueva solicitud de cita</h2>
      <p style="color:#555;margin:0 0 20px">${office}</p>
      <ul style="color:#333;line-height:1.7;padding-left:18px">
        ${bullets.map((b) => `<li>${b}</li>`).join("")}
      </ul>
      <p style="margin:24px 0">
        <a href="${url}"
           style="background:#800080;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;display:inline-block">
          Ver en el panel
        </a>
      </p>
      <p style="color:#777;font-size:13px;line-height:1.6;margin-top:28px">
        Este aviso no incluye el nombre ni el teléfono del paciente a propósito.
        Esos datos viven en el panel, detrás de tu sesión.
      </p>
    </div>`;

  await send(subject, text, html);
}