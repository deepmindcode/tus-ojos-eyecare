import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * src/app/api/promotion/event/route.ts
 *
 * Apunta que una promoción se vio, se cerró o se pulsó.
 *
 * Existe por la misma razón que la ruta de al lado: para que el
 * navegador no tenga que cargar la librería de Supabase entera sólo
 * para registrar tres eventos.
 *
 * No se guarda nada de quien navega. El evento es de la PROMOCIÓN —
 * cuántas veces se mostró, cuántas se pulsó— y eso es lo único que
 * necesita saber el negocio para decidir si una oferta funciona.
 */

export const runtime = "edge";

const EVENTS = new Set(["impression", "dismiss", "click"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let body: { id?: unknown; event?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const event = typeof body.event === "string" ? body.event : "";
  const locale = body.locale === "es" ? "es" : "en";

  // Todo lo que llega del navegador se comprueba aquí. Sin esto, la
  // ruta sería un formulario abierto para escribir filas arbitrarias en
  // la tabla de estadísticas.
  if (!UUID.test(id) || !EVENTS.has(event)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return NextResponse.json({ ok: true });

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.rpc("track_promotion_event", {
    p_promotion_id: id,
    p_event: event,
    p_locale: locale,
    p_location: null,
  });

  // Una estadística perdida no es motivo para enseñarle un error a
  // nadie: el popup ya hizo su trabajo.
  if (error) console.error("[promotion] evento no registrado:", error.message);

  return NextResponse.json({ ok: true });
}
