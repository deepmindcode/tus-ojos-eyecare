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

  const row = {
    name: input.name.trim(),
    subject_es: input.subjectEs.trim(),
    subject_en: (input.subjectEn || input.subjectEs).trim(),
    body_es: input.bodyEs.trim(),
    body_en: input.bodyEn.trim(),
    location_id: input.locationId || null,
    reason: input.reason || null,
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
    return { ok: false as const, error: "saveFailed" };
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
    .select("location_id, reason, locations(city)")
    .eq("id", campaignId)
    .single();

  const city = (c?.locations as unknown as { city?: string } | null)?.city ?? null;
  const reason = (c?.reason as string) ?? null;

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
  };
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

  const { data: c } = await supabase
    .from("campaigns")
    .select("subject_es, subject_en, body_es, body_en, promotion_id, promotions(slug, discount_label_es)")
    .eq("id", campaignId)
    .single();

  const promo = c?.promotions as unknown as
    | { slug: string | null; discount_label_es: string | null }
    | null;

  const results = await sendBatch(
    {
      subject: (c?.subject_es as string) ?? "",
      body: (c?.body_es as string) ?? "",
      bodyAlt: (c?.body_en as string) || null,
      discount: promo?.discount_label_es ?? null,
      ctaUrl: appointmentUrl(promo?.slug ?? null),
      ctaLabel: "Pedir cita",
    },
    batch,
  );

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
