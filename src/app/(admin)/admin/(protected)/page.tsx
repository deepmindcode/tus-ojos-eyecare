import { redirect } from "next/navigation";
import Link from "next/link";
import { Printer } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminUser, can } from "@/lib/auth/roles";
import { AppointmentsTable } from "@/components/admin/appointments-table";
import { RefreshBar } from "@/components/admin/refresh-bar";
import { officeClock } from "@/lib/office-time";
import { LOCATIONS } from "@/config/site";

export const dynamic = "force-dynamic";

interface SearchParams {
  location?: string;
  status?: string;
  range?: string;
  follow?: string;
}

/**
 * Una solicitud "necesita seguimiento" cuando lleva demasiado tiempo sin
 * que nadie la mueva:
 *   - NEW sin tocar en más de 24 h
 *   - CONTACT_ATTEMPTED sin avanzar en más de 48 h (se intentó una vez y
 *     ahí quedó)
 *
 * Es la métrica que le importa a dirección: no cuántas citas entran, sino
 * cuántas se están enfriando.
 */
function needsFollowUp(status: string, createdAt: string): boolean {
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  if (status === "NEW") return hours > 24;
  if (status === "CONTACT_ATTEMPTED") return hours > 48;
  return false;
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getAdminUser();
  if (!can(user, "appointments:read")) redirect("/admin/login");

  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  // Rango por defecto: 30 días. Cargar el histórico completo en cada
  // visita es lento y además expone más datos de los necesarios.
  const days = sp.range === "7" ? 7 : sp.range === "90" ? 90 : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  let query = supabase
    .from("appointment_requests")
    .select(
      "id, first_name, last_name, phone, email, preferred_date, preferred_time, reason, notes, promotion_label, communication_preference, sms_transactional_consent, patient_status, status, created_at, location_id, locations(slug, city)",
    )
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(300);

  if (sp.status) query = query.eq("status", sp.status);

  const { data, error } = await query;
  if (error) console.error("[admin] fallo cargando citas:", error);

  type Row = NonNullable<typeof data>[number];
  const all = (data ?? []) as Row[];

  // El filtro por sede se aplica en memoria porque llega como slug
  const rows = sp.location
    ? all.filter((r) => (r.locations as unknown as { slug: string } | null)?.slug === sp.location)
    : all;

  const stale = rows.filter((r) =>
    needsFollowUp(r.status as string, r.created_at as string),
  );

  const counts = {
    total: rows.length,
    isNew: rows.filter((r) => r.status === "NEW").length,
    stale: stale.length,
    confirmed: rows.filter((r) => r.status === "CONFIRMED").length,
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = rows.filter((r) => r.created_at?.slice(0, 10) === today).length;

  const visible = sp.follow === "1" ? stale : rows;

  const seesAll = ["SUPER_ADMIN", "OWNER", "MANAGER"].some((r) =>
    user!.roles.includes(r as never),
  );

  // A qué sedes tiene acceso esta persona. Sólo se consulta para quien
  // NO ve todas: para dirección era una consulta extra en cada carga
  // cuyo resultado ni siquiera se mostraba.
  //
  // Las políticas RLS ya filtran las filas; esto sólo sirve para
  // decírselo en pantalla y que nadie piense que faltan datos por error.
  let scopedCities: string[] = [];
  if (!seesAll) {
    const { data: scope } = await supabase
      .from("user_locations")
      .select("locations(city)")
      .eq("user_id", user!.id);
    scopedCities = (scope ?? [])
      .map((s) => (s.locations as unknown as { city: string } | null)?.city)
      .filter(Boolean) as string[];
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-primary">
            Appointment requests
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Last {days} days · {counts.total} requests · {todayCount} today
          </p>
          {!seesAll && (
            <p className="mt-1 text-sm font-semibold text-brand-secondary-deep">
              {scopedCities.length > 0
                ? `Showing ${scopedCities.join(", ")} only`
                : "No office assigned to your account yet — ask an administrator."}
            </p>
          )}
        </div>

        {can(user, "appointments:export") && (
          <Link
            href={`/admin/print${sp.location ? `?location=${sp.location}` : ""}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-brand-primary px-5 text-sm font-bold text-brand-primary hover:bg-brand-primary-tint"
          >
            <Printer className="size-4" aria-hidden="true" />
            Print list
          </Link>
        )}
      </div>

      {/* Las solicitudes entran solas y el estado lo cambia otra persona
          desde otra sede. Sin esto habría que recargar a mano para
          enterarse, y nadie recarga. */}
      <div className="mt-4 flex justify-end">
        <RefreshBar updatedAt={officeClock()} label="Updated" />
      </div>

      {/* Filtros como enlaces: la URL guarda el estado, así recepción
          puede marcar "Camden + nuevas" como favorito en el navegador. */}
      <div className="mt-6 flex flex-wrap gap-2">
        <FilterLink label="All offices" active={!sp.location} params={{ ...sp, location: undefined }} />
        {LOCATIONS.filter((l) => l.active).map((l) => (
          <FilterLink
            key={l.id}
            label={l.city}
            active={sp.location === l.slug}
            params={{ ...sp, location: l.slug }}
          />
        ))}
        <span className="w-full" />
        <FilterLink
          label="Needs follow-up"
          active={sp.follow === "1"}
          params={{ ...sp, follow: sp.follow === "1" ? undefined : "1", status: undefined }}
        />
        <FilterLink label="All statuses" active={!sp.status && sp.follow !== "1"} params={{ ...sp, status: undefined, follow: undefined }} />
        {["NEW", "CONTACT_ATTEMPTED", "CONFIRMED", "NO_RESPONSE"].map((s) => (
          <FilterLink
            key={s}
            label={s.replace(/_/g, " ").toLowerCase()}
            active={sp.status === s}
            params={{ ...sp, status: s }}
          />
        ))}
      </div>

      <div className="mt-6">
        <AppointmentsTable
          rows={visible.map((r) => ({
            id: r.id as string,
            name: `${r.first_name} ${r.last_name}`,
            phone: r.phone as string,
            email: (r.email as string) ?? null,
            city: (r.locations as unknown as { city: string } | null)?.city ?? "—",
            reason: r.reason as string,
            patientStatus: r.patient_status as string,
            preferredDate: (r.preferred_date as string) ?? null,
            preferredTime: (r.preferred_time as string) ?? null,
            notes: (r.notes as string) ?? null,
            // El descuento que pidió, copiado al momento de la solicitud.
            promotionLabel: (r.promotion_label as string) ?? null,
            commPref: r.communication_preference as string,
            smsConsent: Boolean(r.sms_transactional_consent),
            status: r.status as string,
            createdAt: r.created_at as string,
            stale: needsFollowUp(r.status as string, r.created_at as string),
          }))}
          canUpdate={can(user, "appointments:update")}
          todayCount={todayCount}
        />
      </div>
    </>
  );
}

function FilterLink({
  label,
  active,
  params,
}: {
  readonly label: string;
  readonly active: boolean;
  readonly params: Record<string, string | undefined>;
}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => Boolean(v)) as [string, string][],
  ).toString();

  return (
    <Link
      href={`/admin${qs ? `?${qs}` : ""}`}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-bold capitalize ${
        active
          ? "border-brand-primary bg-brand-primary text-white"
          : "border-border-subtle bg-surface text-text-secondary hover:border-brand-secondary"
      }`}
    >
      {label}
    </Link>
  );
}
