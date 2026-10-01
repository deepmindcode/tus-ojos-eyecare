import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * src/lib/promotions.ts
 *
 * Resuelve el `?promo=<slug>` del enlace en algo que el formulario pueda
 * mostrar: el texto del descuento y, si la promocion es de una sola sede,
 * esa sede ya fijada.
 *
 * Se resuelve en el SERVIDOR, nunca en el navegador. Si el visitante
 * edita la URL y escribe `?promo=50-por-ciento-gratis`, la base no
 * devuelve nada y el formulario sigue como si no hubiera promocion. El
 * descuento que se guarda en la cita es el que dice la base de datos.
 *
 * Usa el cliente de servicio y no el de sesion a proposito: leer una
 * promocion activa no depende de quien mire, y asi funciona igual en una
 * pagina y en la ruta de API, sin depender de cookies.
 */

export interface ResolvedPromotion {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  /** Texto del descuento en el idioma del visitante. Lo vera la sede. */
  readonly discountLabel: string | null;
  readonly terms: string | null;
  /** Si no es null, el formulario fija esta sede y no deja cambiarla. */
  readonly lockedLocationSlug: string | null;
}

/** `cache()` por peticion: la pagina y el formulario piden lo mismo una vez. */
export const resolvePromotion = cache(
  async (slug: string | undefined, locale: string): Promise<ResolvedPromotion | null> => {
    if (!slug || slug.length > 80 || !/^[a-z0-9-]+$/.test(slug)) return null;

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .rpc("get_active_promotion", { p_slug: slug })
      .maybeSingle();

    if (error || !data) return null;

    const p = data as Record<string, unknown>;
    const isES = locale === "es";

    return {
      id: p.id as string,
      slug: p.slug as string,
      title: ((isES ? p.title_es : p.title_en) as string) ?? "",
      discountLabel: ((isES ? p.discount_label_es : p.discount_label_en) as string) ?? null,
      terms: ((isES ? p.offer_terms_es : p.offer_terms_en) as string) ?? null,
      lockedLocationSlug: (p.exclusive_location_slug as string) ?? null,
    };
  },
);

/**
 * Validacion al enviar la cita.
 *
 * Devuelve el id y la etiqueta que se guardaran, o null si el slug no
 * corresponde a una promocion activa. Tambien comprueba la sede: si la
 * promocion era solo de Camden y llega una cita de Cherry Hill, la cita
 * se guarda pero SIN el descuento, porque la oferta no aplicaba ahi.
 */
export async function validatePromotionForAppointment(
  slug: string | undefined,
  locationSlug: string,
  locale: string,
): Promise<{ promotionId: string | null; promotionLabel: string | null }> {
  const promo = await resolvePromotion(slug, locale);
  if (!promo) return { promotionId: null, promotionLabel: null };

  if (promo.lockedLocationSlug && promo.lockedLocationSlug !== locationSlug) {
    return { promotionId: null, promotionLabel: null };
  }

  return {
    promotionId: promo.id,
    // Copia del texto en el momento de la solicitud: si el admin edita la
    // promocion el mes que viene, esta cita debe seguir diciendo que se
    // le prometio a ESTA persona.
    promotionLabel: promo.discountLabel ?? promo.title,
  };
}