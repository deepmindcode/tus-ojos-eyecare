"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAdminUser, can } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import {
  MASCOT_FREQUENCIES,
  MASCOT_SIDES,
  type MascotFrequency,
  type MascotSide,
} from "./types";
import type { PromotionStatus, PromotionRow, PromotionInput } from "./types";

/**
 * Gestión de promociones.
 *
 * Separación de permisos (§97): CONTENT_EDITOR puede redactar borradores,
 * pero sólo dirección publica. Una promoción publicada es una promesa
 * comercial con consecuencias legales; no debería poder activarla quien
 * sólo tiene permiso para escribir textos.
 */

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function listPromotions(): Promise<PromotionRow[]> {
  const user = await getAdminUser();
  if (!can(user, "offers:create")) return [];

  const supabase = await createSupabaseServerClient();

  const [promos, stats] = await Promise.all([
    supabase
      .from("promotions")
      .select(
        "id, slug, internal_name, title_en, title_es, description_en, description_es, discount_label_en, discount_label_es, offer_terms_en, offer_terms_es, cta_label_en, cta_label_es, display_type, delay_seconds, frequency, start_at, end_at, status, is_demo, show_popup, allow_campaign, exclusive_location_id, locations:exclusive_location_id(slug)",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("promotion_stats").select("id, impressions, cta_clicks, appointments"),
  ]);

  if (promos.error) {
    console.error("[admin] fallo cargando promociones:", promos.error);
    return [];
  }

  const byId = new Map(
    (stats.data ?? []).map((s) => [
      s.id as string,
      {
        impressions: Number(s.impressions ?? 0),
        ctaClicks: Number(s.cta_clicks ?? 0),
        appointments: Number(s.appointments ?? 0),
      },
    ]),
  );

  return (promos.data ?? []).map((p) => {
    const m = byId.get(p.id as string);
    return {
      id: p.id as string,
      slug: (p.slug as string) ?? null,
      internalName: p.internal_name as string,
      titleEn: p.title_en as string,
      titleEs: p.title_es as string,
      descriptionEn: (p.description_en as string) ?? null,
      descriptionEs: (p.description_es as string) ?? null,
      discountLabelEn: (p.discount_label_en as string) ?? null,
      discountLabelEs: (p.discount_label_es as string) ?? null,
      termsEn: (p.offer_terms_en as string) ?? null,
      termsEs: (p.offer_terms_es as string) ?? null,
      ctaLabelEn: (p.cta_label_en as string) ?? null,
      ctaLabelEs: (p.cta_label_es as string) ?? null,
      exclusiveLocationSlug:
        (p.locations as unknown as { slug: string } | null)?.slug ?? null,
      displayType: p.display_type as string,
      delaySeconds: Number(p.delay_seconds ?? 7),
      frequency: p.frequency as string,
      startAt: (p.start_at as string) ?? null,
      endAt: (p.end_at as string) ?? null,
      status: p.status as PromotionStatus,
      showPopup: p.show_popup !== false,
      allowCampaign: Boolean(p.allow_campaign),
      isDemo: Boolean(p.is_demo),
      impressions: m?.impressions ?? 0,
      ctaClicks: m?.ctaClicks ?? 0,
      appointments: m?.appointments ?? 0,
    };
  });
}

export async function savePromotion(input: PromotionInput) {
  const user = await getAdminUser();
  if (!can(user, "offers:create")) return { ok: false as const, error: "forbidden" };

  if (!input.internalName.trim()) return { ok: false as const, error: "nameRequired" };
  if (!input.titleEn.trim() || !input.titleEs.trim()) {
    // Las dos versiones son obligatorias (§84): publicar sólo en inglés
    // deja a la mitad de los pacientes sin ver la oferta.
    return { ok: false as const, error: "bothLanguagesRequired" };
  }
  if (input.endAt && input.startAt && new Date(input.endAt) <= new Date(input.startAt)) {
    return { ok: false as const, error: "badDates" };
  }

  const supabase = createSupabaseAdminClient();

  let exclusiveId: string | null = null;
  if (input.exclusiveLocationSlug) {
    const { data } = await supabase
      .from("locations")
      .select("id")
      .eq("slug", input.exclusiveLocationSlug)
      .single();
    exclusiveId = (data?.id as string) ?? null;
  }

  const slug = slugify(input.slug || input.internalName);

  const payload = {
    internal_name: input.internalName.trim(),
    slug,
    title_en: input.titleEn.trim(),
    title_es: input.titleEs.trim(),
    description_en: input.descriptionEn.trim() || null,
    description_es: input.descriptionEs.trim() || null,
    discount_label_en: input.discountLabelEn.trim() || null,
    discount_label_es: input.discountLabelEs.trim() || null,
    offer_terms_en: input.termsEn.trim() || null,
    offer_terms_es: input.termsEs.trim() || null,
    cta_type: "schedule",
    cta_label_en: input.ctaLabelEn.trim() || null,
    cta_label_es: input.ctaLabelEs.trim() || null,
    exclusive_location_id: exclusiveId,
    location_target: exclusiveId ? [input.exclusiveLocationSlug] : ["all"],
    page_target: ["all"],
    language_target: ["en", "es"],
    display_type: input.displayType,
    delay_seconds: Math.max(3, input.delaySeconds),
    frequency: input.frequency,
    // Dos destinos independientes. Una oferta puede ser solo del correo,
    // solo de la web, o las dos: si fuera un unico interruptor no habria
    // forma de premiar a quien recibe la campana con algo que el resto
    // no ve.
    show_popup: input.showPopup,
    allow_campaign: input.allowCampaign,
    trigger_type: "delay",
    dismissible: true,
    start_at: input.startAt || null,
    end_at: input.endAt || null,
  };

  if (input.id) {
    const { error } = await supabase.from("promotions").update(payload).eq("id", input.id);
    if (error) {
      console.error("[admin] fallo actualizando promoción:", error);
      return { ok: false as const, error: error.message.includes("slug") ? "slugTaken" : "server" };
    }
    after(async () => {
      await logAudit({
        userId: user!.id,
        action: "promotion.updated",
        objectType: "promotion",
        objectId: input.id!,
        details: { slug },
      });
    });
  } else {
    const { data, error } = await supabase
      .from("promotions")
      .insert({ ...payload, status: "DRAFT", created_by: user!.id })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[admin] fallo creando promoción:", error);
      return {
        ok: false as const,
        error: error?.message.includes("slug") ? "slugTaken" : "server",
      };
    }
    after(async () => {
      await logAudit({
        userId: user!.id,
        action: "promotion.created",
        objectType: "promotion",
        objectId: data.id as string,
        details: { slug },
      });
    });
  }

  revalidatePath("/admin/offers");
  return { ok: true as const };
}

/**
 * Cambia el estado de una promoción.
 *
 * Publicar (ACTIVE) exige permiso de dirección. Pausar y archivar
 * también: parar una campaña a medias tiene consecuencias comerciales.
 */
export async function setPromotionStatus(id: string, status: PromotionStatus) {
  const user = await getAdminUser();
  const needsPublishRights = status === "ACTIVE" || status === "PAUSED" || status === "ARCHIVED";

  if (needsPublishRights ? !can(user, "offers:publish") : !can(user, "offers:create")) {
    return { ok: false as const, error: "forbidden" };
  }

  const supabase = createSupabaseAdminClient();

  if (status === "ACTIVE") {
    // No se publica una promoción a medio escribir: sin texto del
    // descuento, recepción no sabría qué le prometieron al paciente.
    const { data: p } = await supabase
      .from("promotions")
      .select("title_en, title_es, discount_label_en, discount_label_es, slug")
      .eq("id", id)
      .single();

    if (!p?.slug || !p.title_en || !p.title_es) {
      return { ok: false as const, error: "incomplete" };
    }
    if (!p.discount_label_en || !p.discount_label_es) {
      return { ok: false as const, error: "missingDiscount" };
    }
  }

  const { error } = await supabase
    .from("promotions")
    .update({ status, published_by: status === "ACTIVE" ? user!.id : undefined })
    .eq("id", id);

  if (error) {
    console.error("[admin] fallo cambiando estado de promoción:", error);
    return { ok: false as const, error: "server" };
  }

  after(async () => {
    await logAudit({
      userId: user!.id,
      action: `promotion.${status.toLowerCase()}`,
      objectType: "promotion",
      objectId: id,
      details: { status },
    });
  });

  revalidatePath("/admin/offers");
  return { ok: true as const };
}
/* ------------------------------------------------------------------ */

/**
 * Encender o apagar a Manzanito.
 *
 * El ajuste se escribe con service_role, no con la sesión: `site_settings`
 * sólo deja escribir a administradores por RLS, y aquí el permiso ya se
 * ha comprobado arriba con `mascot:manage`. Dos puertas, no una.
 */
export async function setManzanito(on: boolean) {
  const user = await getAdminUser();
  if (!can(user, "mascot:manage")) return { ok: false as const, error: "forbidden" };

  const { error } = await createSupabaseAdminClient()
    .from("site_settings")
    .update({ value: on, updated_by: user!.id, updated_at: new Date().toISOString() })
    .eq("key", "manzanito_enabled");

  if (error) {
    console.error("[mascot] no se pudo guardar el interruptor:", error);
    return { ok: false as const, error: "server" };
  }

  // Queda en el registro: cambia lo que ve todo el que entra al sitio.
  after(async () => {
    await logAudit({
      userId: user!.id,
      action: on ? "mascot.enabled" : "mascot.disabled",
      objectType: "site_setting",
      details: { key: "manzanito_enabled" },
    });
  });

  revalidatePath("/admin/offers");
  return { ok: true as const };
}

/** Cada cuánto vuelve a salirle Manzanito a la misma persona. */
export async function setManzanitoFrequency(freq: string) {
  const user = await getAdminUser();
  if (!can(user, "mascot:manage")) return { ok: false as const, error: "forbidden" };

  // Se valida contra la lista, no se guarda lo que llegue: esta columna
  // la lee el sitio público y no debe poder contener cualquier cosa.
  if (!(MASCOT_FREQUENCIES as readonly string[]).includes(freq)) {
    return { ok: false as const, error: "invalid" };
  }

  const { error } = await createSupabaseAdminClient()
    .from("site_settings")
    .update({ value: freq, updated_by: user!.id, updated_at: new Date().toISOString() })
    .eq("key", "manzanito_frequency");

  if (error) {
    console.error("[mascot] no se pudo guardar la frecuencia:", error);
    return { ok: false as const, error: "server" };
  }

  after(async () => {
    await logAudit({
      userId: user!.id,
      action: "mascot.frequency_changed",
      objectType: "site_setting",
      details: { frequency: freq },
    });
  });

  revalidatePath("/admin/offers");
  return { ok: true as const };
}

/** Por qué lado entra. */
export async function setManzanitoSide(side: string) {
  const user = await getAdminUser();
  if (!can(user, "mascot:manage")) return { ok: false as const, error: "forbidden" };
  if (!(MASCOT_SIDES as readonly string[]).includes(side)) {
    return { ok: false as const, error: "invalid" };
  }

  const { error } = await createSupabaseAdminClient()
    .from("site_settings")
    .update({ value: side, updated_by: user!.id, updated_at: new Date().toISOString() })
    .eq("key", "manzanito_side");

  if (error) {
    console.error("[mascot] no se pudo guardar el lado:", error);
    return { ok: false as const, error: "server" };
  }

  revalidatePath("/admin/offers");
  return { ok: true as const };
}

/** Estado actual de la mascota. */
export async function manzanitoSettings(): Promise<{
  enabled: boolean;
  frequency: MascotFrequency;
  side: MascotSide;
}> {
  const { data } = await createSupabaseAdminClient()
    .from("site_settings")
    .select("key, value")
    .in("key", ["manzanito_enabled", "manzanito_frequency", "manzanito_side"]);

  const map = new Map((data ?? []).map((r) => [r.key as string, r.value]));
  const raw = map.get("manzanito_frequency");
  const rawSide = map.get("manzanito_side");
  return {
    enabled: map.get("manzanito_enabled") === true,
    frequency: (MASCOT_FREQUENCIES as readonly string[]).includes(raw as string)
      ? (raw as MascotFrequency)
      : "daily",
    side: (MASCOT_SIDES as readonly string[]).includes(rawSide as string)
      ? (rawSide as MascotSide)
      : "random",
  };
}
