import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { rateLimit, verifyTurnstile } from "@/lib/rate-limit";
import {
  appointmentSchema,
  normalizePhone,
  CONSENT_VERSION,
} from "@/lib/validation/appointment";
import { validatePromotionForAppointment } from "@/lib/promotions";

/**
 * Recepción de solicitudes de cita.
 *
 * Escribe con service_role, que ignora RLS. Es deliberado: NO existe
 * política de INSERT para `anon` en appointment_requests, así que aunque
 * alguien extraiga la clave pública del bundle no puede insertar nada.
 * Todo pasa por aquí, y aquí se valida.
 *
 * Orden de las defensas — de la más barata a la más cara:
 *   1. Honeypot        (gratis, descarta la mayoría de bots)
 *   2. Rate limit      (una consulta a Redis)
 *   3. Zod             (CPU local)
 *   4. Turnstile       (llamada de red a Cloudflare)
 *   5. Escritura en BD
 */

export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
  // En Vercel el primer valor de x-forwarded-for es el cliente real.
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent")?.slice(0, 400) ?? null;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "badRequest" }, { status: 400 });
  }

  // ---- 1. Honeypot -------------------------------------------------
  // Se comprueba aquí y no en el navegador: el autocompletado y los
  // gestores de contraseñas rellenan campos llamados "website", y eso
  // bloqueaba a personas reales.
  //
  // Se responde 200 a propósito. Si devolviéramos un error, quien opera
  // el bot sabría que detectamos la trampa y la esquivaría.
  const b = body as { confirmSubscription?: unknown; startedAt?: unknown };

  if (b?.confirmSubscription === true) {
    console.warn("[appointment] honeypot activado", { ip });
    return NextResponse.json({ ok: true });
  }

  // Segunda señal, independiente del formulario: velocidad. Rellenar
  // cinco pasos en menos de dos segundos y medio no lo hace una persona.
  if (typeof b?.startedAt === "number") {
    const elapsed = Date.now() - b.startedAt;
    if (elapsed >= 0 && elapsed < 2500) {
      console.warn("[appointment] envío demasiado rápido", { ip, elapsed });
      return NextResponse.json({ ok: true });
    }
  }

  const parsed = appointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "validation",
        fields: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          code: i.message,
        })),
      },
      { status: 422 },
    );
  }

  const data = parsed.data;

  // ---- 2. Rate limit ------------------------------------------------
  const byIp = await rateLimit(`appt:ip:${ip}`, { limit: 5, windowSeconds: 3600 });
  if (!byIp.success) {
    return NextResponse.json(
      { error: "rateLimited" },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfterSeconds) } },
    );
  }

  const phone = normalizePhone(data.phone)!;

  // Mismo teléfono repetido: probablemente doble clic, no ataque.
  const byPhone = await rateLimit(`appt:phone:${phone}`, { limit: 3, windowSeconds: 86400 });
  if (!byPhone.success) {
    return NextResponse.json({ error: "duplicate" }, { status: 429 });
  }

  // ---- 3. Turnstile -------------------------------------------------
  if (!(await verifyTurnstile(data.turnstileToken, ip))) {
    return NextResponse.json({ error: "captcha" }, { status: 403 });
  }

  // ---- 4. Escritura -------------------------------------------------
  const supabase = createSupabaseAdminClient();

  // La ubicación se resuelve por slug contra la base: nunca confiamos en
  // un id que venga del cliente.
  const { data: location, error: locError } = await supabase
    .from("locations")
    .select("id, city")
    .eq("slug", data.locationId)
    .eq("active", true)
    .single();

  if (locError || !location) {
    return NextResponse.json({ error: "unknownLocation" }, { status: 422 });
  }

  // La promoción se valida contra la base: el descuento que se guarda
  // es el que dice la base, nunca el que venga en la URL. Y si la promo
  // era de una sola sede y la cita es de otra, no hay descuento.
  const { promotionId, promotionLabel } = await validatePromotionForAppointment(
    data.promo,
    data.locationId,
    data.locale,
  );

  const consentAt = new Date().toISOString();

  const { data: appointment, error: insertError } = await supabase
    .from("appointment_requests")
    .insert({
      location_id: location.id,
      patient_status: data.patientStatus,
      first_name: data.firstName,
      last_name: data.lastName,
      phone,
      email: data.email || null,
      preferred_date: data.preferredDate || null,
      preferred_time: data.preferredTime || null,
      reason: data.reason,
      promotion_id: promotionId,
      promotion_label: promotionLabel,
      notes: data.notes || null,
      communication_preference: data.communicationPreference,
      sms_transactional_consent: data.smsTransactionalConsent,
      sms_marketing_consent: data.smsMarketingConsent,
      consent_timestamp: data.smsTransactionalConsent || data.smsMarketingConsent ? consentAt : null,
      consent_language: data.locale,
      consent_version: CONSENT_VERSION,
      ip_address: ip === "unknown" ? null : ip,
      user_agent: userAgent,
    })
    .select("id")
    .single();

  if (insertError || !appointment) {
    // No devolvemos el error interno: filtraría estructura de la base.
    console.error("[appointment] fallo al insertar:", insertError);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  // ---- 5. Registro de consentimiento --------------------------------
  // Tabla aparte: la evidencia TCPA debe sobrevivir aunque la solicitud
  // se borre o se archive.
  const consents = [];
  if (data.smsTransactionalConsent) {
    consents.push({ type: "sms_transactional", granted: true });
  }
  if (data.smsMarketingConsent) {
    consents.push({ type: "sms_marketing", granted: true });
  }
  if (consents.length > 0) {
    const { error } = await supabase.from("consent_records").insert(
      consents.map((c) => ({
        ...c,
        phone,
        email: data.email || null,
        language: data.locale,
        consent_text_version: CONSENT_VERSION,
        source_page: "/appointment",
        ip_address: ip === "unknown" ? null : ip,
        user_agent: userAgent,
      })),
    );
    if (error) console.error("[appointment] fallo registrando consentimiento:", error);
  }

  // ---- 6. Notificación interna --------------------------------------
  // El aviso NO lleva datos clínicos ni del paciente (§21): sólo dice que
  // hay algo que revisar. Los detalles viven en el portal.
  const { error: notifyError } = await supabase.from("notifications").insert({
    channel: "admin_inbox",
    location_id: location.id,
    object_type: "appointment_request",
    object_id: appointment.id,
    payload: { office: location.city },
    status: "queued",
  });
  if (notifyError) console.error("[appointment] fallo encolando notificación:", notifyError);

  return NextResponse.json({ ok: true, id: appointment.id });
}
