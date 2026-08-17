import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminUser, can } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { PrintButton } from "@/components/admin/print-button";
import { LOCATIONS, BRAND } from "@/config/site";

export const dynamic = "force-dynamic";

/**
 * Lista imprimible por sede.
 *
 * POR QUÉ ESTO Y NO UN PDF ENVIADO POR CORREO:
 * un PDF con nombres, teléfonos y motivos de consulta, una vez sale por
 * email, vive para siempre en el buzón de quien lo reciba, en su móvil y
 * en cada reenvío. Nadie puede retirarlo ni saber quién lo abrió.
 *
 * Esta página la genera un usuario autenticado, queda registrada en
 * audit_logs con su nombre y la hora, y el pie del papel dice quién la
 * imprimió. Si aparece una copia olvidada en un mostrador, se sabe de
 * dónde salió. El navegador la convierte en PDF con Ctrl+P.
 */
export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; days?: string }>;
}) {
  const user = await getAdminUser();
  if (!can(user, "appointments:export")) redirect("/admin/login");

  const sp = await searchParams;
  const days = sp.days === "1" ? 1 : sp.days === "30" ? 30 : 7;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("appointment_requests")
    .select(
      "id, first_name, last_name, phone, preferred_date, preferred_time, reason, patient_status, communication_preference, status, created_at, locations(slug, city)",
    )
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  type Row = NonNullable<typeof data>[number];
  const all = (data ?? []) as Row[];
  const rows = sp.location
    ? all.filter((r) => (r.locations as unknown as { slug: string } | null)?.slug === sp.location)
    : all;

  const office = LOCATIONS.find((l) => l.slug === sp.location);
  const printedAt = new Date();

  await logAudit({
    userId: user!.id,
    action: "appointment.list_printed",
    objectType: "appointment_request",
    details: { office: office?.city ?? "all", days, count: rows.length },
  });

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <PrintButton />
        <a href="/admin" className="text-sm font-bold text-brand-primary hover:underline">
          Back to appointments
        </a>
        <span className="ml-auto text-sm text-text-secondary">
          Use Ctrl+P and choose &quot;Save as PDF&quot; to keep a copy.
        </span>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-8 print:rounded-none print:border-0 print:p-0">
        <header className="border-b-2 border-brand-primary pb-4">
          <h1 className="font-display text-2xl font-extrabold text-brand-primary">
            {BRAND.name} — Appointment requests
          </h1>
          <p className="mt-1 text-sm">
            <strong>{office ? `${office.city}, ${office.state}` : "All offices"}</strong> · last{" "}
            {days} {days === 1 ? "day" : "days"} · {rows.length} requests
          </p>
          {office && (
            <p className="text-sm text-text-secondary">
              {office.addressLine1}, {office.city}, {office.state} {office.postalCode} ·{" "}
              {office.phone}
            </p>
          )}
        </header>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left">
              <th className="py-2 pr-3 font-bold">Received</th>
              <th className="py-2 pr-3 font-bold">Patient</th>
              <th className="py-2 pr-3 font-bold">Phone</th>
              <th className="py-2 pr-3 font-bold">Reason</th>
              <th className="py-2 pr-3 font-bold">Prefers</th>
              <th className="py-2 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id as string} className="border-b border-border-subtle align-top">
                <td className="py-2 pr-3 whitespace-nowrap">
                  {new Date(r.created_at as string).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="py-2 pr-3">
                  {r.first_name} {r.last_name}
                  {r.patient_status === "existing" && (
                    <span className="block text-xs text-text-secondary">returning</span>
                  )}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.phone as string}</td>
                <td className="py-2 pr-3 capitalize">
                  {(r.reason as string).replace(/_/g, " ").toLowerCase()}
                  {r.preferred_date && (
                    <span className="block text-xs text-text-secondary">
                      wants {r.preferred_date as string}
                      {r.preferred_time ? ` ${r.preferred_time}` : ""}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 capitalize">
                  {(r.communication_preference as string).toLowerCase()}
                </td>
                <td className="py-2 capitalize">
                  {(r.status as string).replace(/_/g, " ").toLowerCase()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="py-10 text-center text-text-secondary">No requests in this period.</p>
        )}

        {/* Pie de trazabilidad: quién lo imprimió y cuándo. Si aparece una
            copia traspapelada, se sabe de dónde salió. */}
        <footer className="mt-8 border-t border-border-subtle pt-4 text-xs text-text-secondary">
          <p>
            Printed by {user!.email} on {printedAt.toLocaleString("en-US")}
          </p>
          <p className="mt-1">
            Contains patient contact information. Do not email, photograph or leave unattended.
            Shred when no longer needed.
          </p>
        </footer>
      </div>
    </div>
  );
}
