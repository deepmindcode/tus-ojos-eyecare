import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * src/app/api/promotion/route.ts
 *
 * Qué promoción toca en esta página. Antes lo preguntaba el navegador
 * directamente a Supabase, y eso tenía dos costes:
 *
 *   1. La librería de Supabase (250 KB sin comprimir) viajaba a TODAS las
 *      páginas públicas, incluidas las legales, sólo por este popup.
 *   2. Una consulta a la base por cada página vista, de cada visitante.
 *
 * Desde aquí, el navegador sólo hace un fetch normal y la respuesta se
 * queda en la CDN: cien personas leyendo la misma página son una
 * consulta a la base, no cien.
 *
 * No hay nada privado en juego. `get_promotion_for_page` es SECURITY
 * DEFINER y ya estaba al alcance del público con la clave anónima; esto
 * sólo cambia por dónde pasa, no quién puede verlo. Por eso usa el
 * cliente anónimo y nunca el de servicio.
 */

export const runtime = "edge";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "/";
  const locale = url.searchParams.get("locale") === "es" ? "es" : "en";

  // El path entra desde el navegador, así que se acota antes de usarlo:
  // tiene que parecer una ruta de este sitio y nada más.
  if (!/^\/[\w\-/]*$/.test(path) || path.length > 120) {
    return NextResponse.json({ promo: null, manzanito: false }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    // Sin configuración no hay promoción ni mascota, pero tampoco un
    // error que rompa la página: simplemente no aparece nada.
    return NextResponse.json({ promo: null, manzanito: false });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Las dos cosas en una sola ida y vuelta: la oferta de esta página y
  // si Manzanito está encendido. Son la misma decisión —qué se le
  // enseña a quien entra— y pedirlas por separado serían dos peticiones
  // por visita para ahorrar nada.
  const [promoRes, flagRes] = await Promise.all([
    supabase.rpc("get_promotion_for_page", { p_path: path, p_locale: locale }).maybeSingle(),
    supabase.from("site_settings").select("value").eq("key", "manzanito_enabled").maybeSingle(),
  ]);

  if (promoRes.error) {
    console.error("[promotion] fallo leyendo la promoción:", promoRes.error.message);
  }

  // Apagado si no hay fila o no se pudo leer: una mascota que aparece
  // sola porque falló una consulta es peor que una que no aparece.
  const manzanito = flagRes.data?.value === true;

  return NextResponse.json({ promo: promoRes.data ?? null, manzanito }, {
    headers: {
      // Un minuto de caché compartida. Una promoción recién publicada
      // tarda como mucho ese minuto en aparecer, y a cambio la base deja
      // de recibir una consulta por visita. `stale-while-revalidate`
      // hace que nadie espere a que se refresque.
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
