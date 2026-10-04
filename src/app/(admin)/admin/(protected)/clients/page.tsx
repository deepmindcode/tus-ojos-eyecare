import { redirect } from "next/navigation";
import Link from "next/link";
import { Printer, Search, Users } from "lucide-react";
import { getAdminUser, can } from "@/lib/auth/roles";
import { RefreshBar } from "@/components/admin/refresh-bar";
import { officeClock } from "@/lib/office-time";
import { formatPhone, matchesQuery, hasReason, allReasons } from "@/lib/clients";
import { loadClients, shortDate, humanize } from "./data";

/**
 * src/app/(admin)/admin/(protected)/clients/page.tsx
 *
 * Directorio de personas que han escrito por el sitio. Una fila por
 * persona, no por envío: quien ha pedido cita tres veces aparece una vez
 * con un 3, y el detalle está dentro.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; reason?: string }>;
}) {
  const user = await getAdminUser();
  if (!can(user, "clients:read")) redirect("/admin");

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const reason = sp.reason?.trim() ?? "";

  const all = await loadClients();
  const reasons = allReasons(all);

  let rows = reason ? all.filter((c) => hasReason(c, reason)) : all;
  if (q) rows = rows.filter((c) => matchesQuery(c, q));

  const returning = all.filter((c) => c.appointmentCount + c.messageCount > 1).length;

  // El enlace de impresión tiene que llevarse los dos filtros, o se
  // imprime una lista distinta de la que se está viendo.
  const printQuery = new URLSearchParams(
    Object.entries({ q, reason }).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-brand-primary">
            <Users className="size-6" aria-hidden="true" />
            Clients
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {all.length} people · {returning} have contacted us more than once
            {(q || reason) && ` · ${rows.length} in this list`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <RefreshBar updatedAt={officeClock()} label="Updated" />
          <Link
            href={`/admin/clients/print${printQuery ? `?${printQuery}` : ""}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-brand-primary px-5 text-sm font-bold text-brand-primary hover:bg-brand-primary-tint"
          >
            <Printer className="size-4" aria-hidden="true" />
            Print list
          </Link>
        </div>
      </div>

      {/* Un formulario normal: la búsqueda queda en la dirección, así que
          se puede compartir el enlace o guardarlo en favoritos. */}
      {/* Buscador y motivo en la MISMA fila y el mismo formulario: son
          dos recortes de la misma lista, y separarlos invita a creer que
          uno sustituye al otro. */}
      <form action="/admin/clients" className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Name, phone or email"
            aria-label="Search clients"
            className="min-h-11 w-full rounded-full border-2 border-border-subtle bg-surface pl-10 pr-4 text-sm focus:border-brand-primary focus:outline-none"
          />
        </div>

        <select
          name="reason"
          defaultValue={reason}
          aria-label="Filter by reason for the appointment"
          className="min-h-11 rounded-full border-2 border-border-subtle bg-surface px-4 text-sm font-semibold focus:border-brand-primary focus:outline-none"
        >
          <option value="">Any reason</option>
          {reasons.map((r) => (
            <option key={r} value={r}>
              {humanize(r)}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="min-h-11 rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-primary-deep"
        >
          Apply
        </button>

        {(q || reason) && (
          <Link
            href="/admin/clients"
            className="min-h-11 rounded-full border-2 border-border-subtle px-4 text-sm font-bold leading-[2.4] text-text-secondary hover:border-brand-secondary"
          >
            Clear
          </Link>
        )}
      </form>

      {reason && (
        <p className="mt-4 rounded-2xl border border-border-subtle bg-brand-secondary-tint p-4 text-sm text-brand-secondary-deep">
          <strong>{rows.length}</strong> {rows.length === 1 ? "person has" : "people have"} asked
          for an appointment about <strong>{humanize(reason)}</strong> at some point. Everyone
          here is a fit for an offer on that service.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-border-subtle bg-surface p-8 text-center text-text-secondary">
          {q || reason
            ? "Nobody matches this filter."
            : "No one has contacted us through the site yet."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border-subtle bg-surface">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left">
                <th className="px-4 py-3 font-bold">Name</th>
                <th className="px-4 py-3 font-bold">Phone</th>
                <th className="px-4 py-3 font-bold">Email</th>
                <th className="px-4 py-3 font-bold">Office</th>
                <th className="px-4 py-3 text-center font-bold">Requests</th>
                <th className="px-4 py-3 text-center font-bold">Messages</th>
                <th className="px-4 py-3 font-bold">First</th>
                <th className="px-4 py-3 font-bold">Last</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.key}
                  className="border-b border-border-subtle last:border-0 hover:bg-brand-secondary-tint/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/clients/${encodeURIComponent(c.key)}`}
                      className="font-bold text-brand-primary hover:underline"
                    >
                      {c.name}
                    </Link>
                    {c.reasons.length > 0 && (
                      <span className="mt-0.5 block text-xs capitalize text-text-secondary">
                        {c.reasons.slice(0, 2).map(humanize).join(", ")}
                        {c.reasons.length > 2 && ` +${c.reasons.length - 2}`}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {c.phones.length > 0 ? formatPhone(c.phones[0]!) : "—"}
                    {c.phones.length > 1 && (
                      <span className="ml-1 text-xs text-text-secondary">
                        +{c.phones.length - 1}
                      </span>
                    )}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-text-secondary">
                    {c.emails[0] ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {c.offices.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-bold tabular-nums">
                    {c.appointmentCount || "—"}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-text-secondary">
                    {c.messageCount || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                    {shortDate(c.firstSeen)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                    {shortDate(c.lastSeen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 max-w-2xl text-xs leading-relaxed text-text-secondary">
        Una persona aparece una sola vez aunque haya escrito varias veces: se
        agrupa por teléfono y por correo. Si dos familiares comparten teléfono,
        pueden salir juntos — ábrelos y lo verás en el historial.
      </p>
    </>
  );
}
