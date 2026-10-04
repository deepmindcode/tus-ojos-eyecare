"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAdminUser, can } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { hasReason } from "@/lib/clients";
import { loadClients } from "../clients/data";
import { MAX_BATCH, appointmentUrl, sendBatch, type Recipient } from "@/lib/campaigns/mail";

/**
 * src/app/(admin)/admin/(protected)/campaigns/actions.ts
 *
 * El público se calcula SIEMPRE en el momento de enviar, nunca se guarda
 * una lista. Entre la tanda del lunes y la del martes alguien puede
 * haberse dado de baja, y una lista congelada le escribiría igual.
 *
 * Se envía a PERSONAS, no a solicitudes: el directorio ya agrupa por
 * teléfono y correo, así que quien pidió cita cuatro veces recibe un
 * correo, no cuatro.
 */

export interface CampaignInput {
  readonly id?: string;
  readonly name: string;
  readonly subjectEs: string;
  readonly subjectEn: string;
  readonly bodyEs: string;
  readonly bodyEn: string;
  readonly locationId: string;
  readonly reason: string;
  readonly promotionId: string;
}

async function leadership() {
  const user = await getAdminUser();
  if (!can(user, "campaigns:manage")) throw new Error("forbidden");
  return user!;
}

/* ------------------------------------------------------------------ */

export async function saveCampaign(input: CampaignInput) {
  const user = await leadership();
  const supabase = createSupabaseAdminClient();

  if (!input.name.trim() || !input.subjectEs.trim() || !input.bodyEs.trim()) {
    return { ok: false as const, error: "missingFields" };
  }

  // Los nombres de columna son los de la tabla, que ya existia antes de
  // esta pantalla: filter_location_id y filter_reason, no location_id ni
  // reason.
  const row = {
    name: input.name.trim(),
    subject_es: input.subjectEs.trim(),
    subject_en: (input.subjectEn || input.subjectEs).trim(),
    body_es: input.bodyEs.trim(),
    body_en: (input.bodyEn || input.bodyEs).trim(),
    filter_location_id: input.locationId || null,
    filter_reason: input.reason || null,
    promotion_id: input.promotionId || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = input.id
    ? await supabase.from("campaigns").update(row).eq("id", input.id).select("id").single()
    : await supabase
        .from("campaigns")
        .insert({ ...row, created_by: user.id })
        .select("id")
        .single();

  if (error) {
    console.error("[campaigns] guardar:", error);
    // Se devuelve el mensaje real. Decir "revisa nombre y asunto" cuando
    // lo que fallo fue la base manda a buscar donde no hay nada.
    return { ok: false as const, error: "saveFailed", detail: error.message };
  }

  await logAudit({
    userId: user.id,
    action: input.id ? "campaign.updated" : "campaign.created",
    objectType: "campaign",
    objectId: data.id as string,
    details: { name: row.name },
  });

  revalidatePath("/admin/campaigns");
  return { ok: true as const, id: data.id as string };
}

/* ------------------------------------------------------------------ */

interface Audience {
  readonly recipients: Recipient[];
  readonly total: number;
  readonly withoutEmail: number;
  readonly unsubscribed: number;
  readonly alreadySent: number;
}

/**
 * Quién debería recibir esta campaña, descontando bajas y lo ya enviado.
 * Se usa igual para el recuento previo y para el envío, así que lo que
 * ves antes de enviar es exactamente lo que va a salir.
 */
async function audienceFor(campaignId: string): Promise<Audience> {
  const supabase = createSupabaseAdminClient();

  const { data: c } = await supabase
    .from("campaigns")
    .select("filter_location_id, filter_reason, locations:filter_location_id(city)")
    .eq("id", campaignId)
    .single();

  const city = (c?.locations as unknown as { city?: string } | null)?.city ?? null;
  const reason = (c?.filter_reason as string) ?? null;

  const clients = await loadClients();

  let people = clients;
  if (reason) people = people.filter((p) => hasReason(p, reason));
  if (city) people = people.filter((p) => p.offices.includes(city));

  const total = people.length;
  const withEmail = people.filter((p) => p.emails.length > 0);
  const withoutEmail = total - withEmail.length;

  const [unsubs, sent] = await Promise.all([
    supabase.from("email_unsubscribes").select("email"),
    supabase.from("campaign_sends").select("email").eq("campaign_id", campaignId),
  ]);

  const blocked = new Set((unsubs.data ?? []).map((u) => String(u.email).toLowerCase()));
  const done = new Set((sent.data ?? []).map((s) => String(s.email).toLowerCase()));

  const recipients: Recipient[] = [];
  let unsubscribed = 0;
  let alreadySent = 0;

  for (const p of withEmail) {
    const email = p.emails[0]!.toLowerCase();
    if (blocked.has(email)) { unsubscribed += 1; continue; }
    if (done.has(email)) { alreadySent += 1; continue; }
    recipients.push({ email, name: p.name });
  }

  return { recipients, total, withoutEmail, unsubscribed, alreadySent };
}

export async function previewAudience(campaignId: string) {
  await leadership();
  const a = await audienceFor(campaignId);
  return {
    pending: a.recipients.length,
    total: a.total,
    withoutEmail: a.withoutEmail,
    unsubscribed: a.unsubscribed,
    alreadySent: a.alreadySent,
    // La lista, para poder elegir a mano. Un recuento no deja comprobar
    // a quien se escribe, y con datos de pacientes eso hay que poder
    // verlo antes de pulsar enviar.
    recipients: a.recipients.slice(0, 500),
  };
}

/** Contenido de la campaña, listo para enviar. */
async function contentFor(campaignId: string) {
  const { data: c } = await createSupabaseAdminClient()
    .from("campaigns")
    .select("subject_es, body_es, body_en, cta_label_es, promotions(slug, discount_label_es)")
    .eq("id", campaignId)
    .single();

  const promo = c?.promotions as unknown as
    | { slug: string | null; discount_label_es: string | null }
    | null;

  return {
    subject: (c?.subject_es as string) ?? "",
    body: (c?.body_es as string) ?? "",
    bodyAlt: (c?.body_en as string) || null,
    discount: promo?.discount_label_es ?? null,
    ctaUrl: appointmentUrl(promo?.slug ?? null),
    ctaLabel: (c?.cta_label_es as string) || "Pedir cita",
  };
}

/**
 * Envía a las personas marcadas a mano.
 *
 * Comprueba que cada dirección esté en el público actual de la campaña.
 * Sin esa comprobación, la pantalla se convertiría en un formulario para
 * escribir a cualquier dirección del mundo desde el dominio del negocio.
 */
export async function sendSelected(campaignId: string, emails: readonly string[]) {
  const user = await leadership();
  const supabase = createSupabaseAdminClient();

  const a = await audienceFor(campaignId);
  const allowed = new Map(a.recipients.map((r) => [r.email, r]));
  const batch = emails
    .map((e) => allowed.get(e.toLowerCase()))
    .filter((r): r is Recipient => Boolean(r))
    .slice(0, MAX_BATCH);

  if (batch.length === 0) return { ok: false as const, error: "nobodySelected" };

  const results = await sendBatch(await contentFor(campaignId), batch);

  await supabase.from("campaign_sends").upsert(
    results.map((r) => ({
      campaign_id: campaignId,
      email: r.email,
      name: batch.find((b) => b.email === r.email)?.name ?? null,
      status: r.ok ? "SENT" : "FAILED",
      provider_id: r.providerId,
      error: r.error,
    })),
    { onConflict: "campaign_id,email" },
  );

  const sent = results.filter((r) => r.ok).length;
  const remaining = a.recipients.length - batch.length;

  // El estado tiene que decir la verdad. Antes sólo lo movían las tandas,
  // así que una campaña enviada a mano seguía marcada «Draft» con correos
  // ya en la calle.
  await supabase
    .from("campaigns")
    .update({ status: remaining > 0 ? "SENDING" : "SENT", updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  await logAudit({
    userId: user.id,
    action: "campaign.selected_sent",
    objectType: "campaign",
    objectId: campaignId,
    details: { sent, failed: results.length - sent },
  });

  revalidatePath("/admin/campaigns");
  return { ok: true as const, sent, failed: results.length - sent };
}

/* ------------------------------------------------------------------ */

/**
 * Cancelar: la campaña deja de poder enviarse, pero NO se borra.
 *
 * Se conserva a propósito quién ya la recibió. Si se borrara, mañana una
 * campaña parecida volvería a escribir a esas mismas personas sin que
 * nadie se diera cuenta.
 */
export async function cancelCampaign(campaignId: string) {
  const user = await leadership();

  await createSupabaseAdminClient()
    .from("campaigns")
    .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  await logAudit({
    userId: user.id,
    action: "campaign.cancelled",
    objectType: "campaign",
    objectId: campaignId,
  });

  revalidatePath("/admin/campaigns");
  return { ok: true as const };
}

/** Volver a abrirla, por si se canceló sin querer. */
export async function reopenCampaign(campaignId: string) {
  const user = await leadership();
  const supabase = createSupabaseAdminClient();

  const { count } = await supabase
    .from("campaign_sends")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  await supabase
    .from("campaigns")
    .update({
      status: (count ?? 0) > 0 ? "SENDING" : "DRAFT",
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  await logAudit({
    userId: user.id,
    action: "campaign.reopened",
    objectType: "campaign",
    objectId: campaignId,
  });

  revalidatePath("/admin/campaigns");
  return { ok: true as const };
}

/**
 * Borrar. Sólo si NO ha salido ni un correo.
 *
 * En cuanto hay un envío, la campaña es también el registro de a quién se
 * le escribió; borrarla borraría esa constancia. Para esas se cancela.
 */
export async function deleteCampaign(campaignId: string) {
  const user = await leadership();
  const supabase = createSupabaseAdminClient();

  const { count } = await supabase
    .from("campaign_sends")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  if ((count ?? 0) > 0) return { ok: false as const, error: "alreadySent" };

  await supabase.from("campaigns").delete().eq("id", campaignId);

  await logAudit({
    userId: user.id,
    action: "campaign.deleted",
    objectType: "campaign",
    objectId: campaignId,
  });

  revalidatePath("/admin/campaigns");
  return { ok: true as const };
}

/**
 * Prueba a tu propia dirección.
 *
 * Va sólo al correo de quien ha iniciado sesión, nunca a una dirección
 * escrita a mano: así la pantalla no sirve para mandar correo a nadie de
 * fuera. Y NO se anota en campaign_sends, para que la prueba no gaste a
 * nadie del público real.
 */
export async function sendTestToSelf(campaignId: string) {
  const user = await leadership();
  if (!user.email) return { ok: false as const, error: "noEmail" };

  const c = await contentFor(campaignId);
  const [r] = await sendBatch(
    { ...c, subject: `[PRUEBA] ${c.subject}` },
    [{ email: user.email, name: user.displayName }],
  );

  return r?.ok
    ? { ok: true as const, to: user.email }
    : { ok: false as const, error: r?.error ?? "sendFailed" };
}

/* ------------------------------------------------------------------ */

/**
 * Envía UNA tanda y para. No hay "enviar todo" a propósito: con una lista
 * dormida de tres años, soltar trescientos correos de golpe desde un
 * dominio que apenas envía es la forma más rápida de acabar en spam, y
 * se lleva por delante también los avisos de citas.
 */
export async function sendNextBatch(campaignId: string, size: number) {
  const user = await leadership();
  const supabase = createSupabaseAdminClient();

  const n = Math.max(1, Math.min(size, MAX_BATCH));
  const a = await audienceFor(campaignId);
  const batch = a.recipients.slice(0, n);

  if (batch.length === 0) {
    await supabase.from("campaigns").update({ status: "SENT" }).eq("id", campaignId);
    revalidatePath("/admin/campaigns");
    return { ok: true as const, sent: 0, failed: 0, remaining: 0 };
  }

  const results = await sendBatch(await contentFor(campaignId), batch);

  // Se anota TODO, también lo que falló: así la siguiente tanda no repite
  // a quien ya recibió, y queda constancia de quién no lo recibió.
  await supabase.from("campaign_sends").upsert(
    results.map((r) => ({
      campaign_id: campaignId,
      email: r.email,
      name: batch.find((b) => b.email === r.email)?.name ?? null,
      status: r.ok ? "SENT" : "FAILED",
      provider_id: r.providerId,
      error: r.error,
    })),
    { onConflict: "campaign_id,email" },
  );

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  const remaining = a.recipients.length - batch.length;

  await supabase
    .from("campaigns")
    .update({ status: remaining > 0 ? "SENDING" : "SENT", updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  await logAudit({
    userId: user.id,
    action: "campaign.batch_sent",
    objectType: "campaign",
    objectId: campaignId,
    details: { sent, failed, remaining },
  });

  revalidatePath("/admin/campaigns");
  return { ok: true as const, sent, failed, remaining };
}

/* ------------------------------------------------------------------ */

/** Baja a mano, para cuando alguien lo pide por teléfono o en el mostrador. */
export async function unsubscribeByHand(email: string) {
  const user = await leadership();
  const clean = email.trim().toLowerCase();
  if (!clean.includes("@")) return { ok: false as const, error: "invalidEmail" };

  await createSupabaseAdminClient()
    .from("email_unsubscribes")
    .upsert({ email: clean, source: "staff" }, { onConflict: "email" });

  await logAudit({
    userId: user.id,
    action: "campaign.unsubscribed_by_staff",
    objectType: "campaign",
    details: { bySt: "manual" },
  });

  revalidatePath("/admin/campaigns");
  return { ok: true as const };
}
