import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminUser, can } from "@/lib/auth/roles";
import { CampaignManager, type CampaignRow, type Option } from "@/components/admin/campaign-manager";
import { humanize } from "../clients/data";

/**
 * src/app/(admin)/admin/(protected)/campaigns/page.tsx
 *
 * Envíos a grupos de clientes. Sólo dirección.
 *
 * Los motivos del desplegable salen del propio enum de la base, no de una
 * lista escrita a mano: si mañana se añade un servicio, aparece aquí solo.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "Campaigns" };

/**
 * Los motivos del enum `appointment_reason`. Escritos aquí y no leídos de
 * la base porque un desplegable no justifica una consulta más en cada
 * carga; si se añade un motivo, se añade también en esta línea, y el
 * TypeScript del formulario de citas ya obliga a pasar por ahí.
 */
const APPOINTMENT_REASONS = [
  "ROUTINE_EXAM", "CONTACT_LENS_EXAM", "EYEWEAR", "PEDIATRIC_EXAM", "DRY_EYE",
  "CORNEA_CONSULT", "KERATOCONUS", "GLAUCOMA_EVAL", "CATARACT_EVAL", "EYE_PROBLEM", "OTHER",
] as const;

export default async function CampaignsPage() {
  const user = await getAdminUser();
  if (!can(user, "campaigns:manage")) redirect("/admin");

  const supabase = await createSupabaseServerClient();

  const [campaigns, sends, locations, promotions] = await Promise.all([
    supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
    supabase.from("campaign_sends").select("campaign_id, status"),
    supabase.from("locations").select("id, city").order("city"),
    // Sólo promociones ACTIVAS. Una en borrador o programada se vería
    // bien en el correo, pero el formulario de cita no la reconoce
    // todavía: el cliente llegaría con la promesa de un descuento que no
    // queda anotado en su solicitud, y eso se descubre en el mostrador.
    supabase
      .from("promotions")
      .select("id, internal_name, discount_label_es, status")
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false }),
  ]);

  const counts = new Map<string, { sent: number; failed: number }>();
  for (const s of sends.data ?? []) {
    const id = s.campaign_id as string;
    const c = counts.get(id) ?? { sent: 0, failed: 0 };
    if (s.status === "SENT") c.sent += 1;
    else c.failed += 1;
    counts.set(id, c);
  }

  const rows: CampaignRow[] = (campaigns.data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    subjectEs: c.subject_es as string,
    subjectEn: (c.subject_en as string) ?? "",
    bodyEs: c.body_es as string,
    bodyEn: (c.body_en as string) ?? "",
    locationId: (c.location_id as string) ?? null,
    reason: (c.reason as string) ?? null,
    promotionId: (c.promotion_id as string) ?? null,
    status: c.status as string,
    sent: counts.get(c.id as string)?.sent ?? 0,
    failed: counts.get(c.id as string)?.failed ?? 0,
    createdAt: c.created_at as string,
  }));

  const locationOptions: Option[] = (locations.data ?? []).map((l) => ({
    value: l.id as string,
    label: l.city as string,
  }));

  const promotionOptions: Option[] = (promotions.data ?? []).map((p) => ({
    value: p.id as string,
    label: `${p.internal_name as string}${p.discount_label_es ? ` — ${p.discount_label_es}` : ""}`,
  }));

  const reasonOptions: Option[] = APPOINTMENT_REASONS.map((v) => ({
    value: v,
    label: humanize(v),
  }));

  return (
    <>
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-brand-primary">
          <Megaphone className="size-6" aria-hidden="true" />
          Campaigns
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Ofertas y seguimientos por correo a un grupo de clientes. Se envía por
          tandas, nunca de golpe, y cada correo lleva su enlace de baja.
        </p>
      </div>

      <div className="mt-6 max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
        <strong>Sólo correo, no mensajes de texto.</strong> Mandar promociones por
        SMS exige consentimiento previo por escrito, y la lista importada del sitio
        anterior no lo tiene: el formulario de entonces nunca lo pidió. Las multas
        van por mensaje. El formulario actual sí lo recoge, así que esto cambiará
        con los clientes nuevos.
      </div>

      <div className="mt-8">
        <CampaignManager
          initial={rows}
          locations={locationOptions}
          reasons={reasonOptions}
          promotions={promotionOptions}
        />
      </div>
    </>
  );
}
