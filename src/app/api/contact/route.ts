import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { rateLimit, verifyTurnstile } from "@/lib/rate-limit";
import { contactSchema } from "@/lib/validation/contact";
import { notifyNewMessage } from "@/lib/notify";

/**
 * src/app/api/contact/route.ts
 *
 * Mensajes del formulario de contacto. Mismo orden de defensas que las
 * citas, de la mas barata a la mas cara:
 *
 *   1. Honeypot     (gratis)
 *   2. Rate limit   (una consulta a Redis)
 *   3. Zod          (CPU local)
 *   4. Turnstile    (red)
 *   5. Escritura
 *
 * Escribe con service_role a proposito: no existe politica de INSERT
 * para `anon` en contact_messages, asi que aunque alguien saque la clave
 * publica del bundle no puede meter nada. Todo pasa por aqui.
 */

export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
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

  const b = body as { confirmSubscription?: unknown; startedAt?: unknown };

  // Se responde 200 a proposito: si devolvieramos un error, quien opera
  // el bot sabria que detectamos la trampa y la esquivaria.
  if (b?.confirmSubscription === true) {
    console.warn("[contact] honeypot activado", { ip });
    return NextResponse.json({ ok: true });
  }

  if (typeof b?.startedAt === "number") {
    const elapsed = Date.now() - b.startedAt;
    if (elapsed >= 0 && elapsed < 2500) {
      console.warn("[contact] envío demasiado rápido", { ip, elapsed });
      return NextResponse.json({ ok: true });
    }
  }

  const parsed = contactSchema.safeParse(body);
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

  const byIp = await rateLimit(`contact:ip:${ip}`, { limit: 5, windowSeconds: 3600 });
  if (!byIp.success) {
    return NextResponse.json(
      { error: "rateLimited" },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfterSeconds) } },
    );
  }

  if (!(await verifyTurnstile(data.turnstileToken, ip))) {
    return NextResponse.json({ error: "captcha" }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();

  // La sede se resuelve por slug contra la base: nunca confiamos en un
  // id que venga del cliente.
  let locationId: string | null = null;
  let city: string | null = null;

  if (data.locationSlug) {
    const { data: location } = await supabase
      .from("locations")
      .select("id, city")
      .eq("slug", data.locationSlug)
      .eq("active", true)
      .single();
    locationId = (location?.id as string) ?? null;
    city = (location?.city as string) ?? null;
  }

  const { data: message, error } = await supabase
    .from("contact_messages")
    .insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      location_id: locationId,
      subject: data.subject,
      message: data.message,
      ip_address: ip === "unknown" ? null : ip,
      user_agent: userAgent,
    })
    .select("id")
    .single();

  if (error || !message) {
    console.error("[contact] fallo al insertar:", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  // El aviso sale despues de responder, y no lleva datos de la persona.
  after(async () => {
    await notifyNewMessage({ office: city, subject: data.subject });
  });

  return NextResponse.json({ ok: true });
}