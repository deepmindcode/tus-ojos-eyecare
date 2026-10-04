import { redirect } from "next/navigation";
import Link from "next/link";
import { Printer, Search, Users } from "lucide-react";
import { getAdminUser, can } from "@/lib/auth/roles";
import { RefreshBar } from "@/components/admin/refresh-bar";
import { officeClock } from "@/lib/office-time";
import { formatPhone, matchesQuery } from "@/lib/clients";
import { loadClients, shortDate } from "./data";

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
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getAdminUser();
  if (!can(user, "clients:read")) redirect("/admin");

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const all = await loadClients();
  const rows = q ? all.filter((c) => matchesQuery(c, q)) : all;

  const returning = all.filter((c) => c.appointmentCount + c.messageCount > 1).length;

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
            {q && ` · ${rows.length} matching "${q}"`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <RefreshBar updatedAt={officeClock()} label="Updated" />
          <Link
            href={`/admin/clients/print${q ? `?q=${encodeURIComponent(q)}` : ""}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-brand-primary px-5 text-sm font-bold text-brand-primary hover:bg-brand-primary-tint"
          >
            <Printer className="size-4" aria-hidden="true" />
            Print list
          </Link>
        </div>
      </div>

      {/* Un formulario normal: la búsqueda queda en la dirección, así que
          se puede compartir el enlace o guardarlo en favoritos. */}
      <form action="/admin/clients" className="mt-6 flex max-w-md gap-2">
        <div className="relative flex-1">
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
        <button
          type="submit"
          className="min-h-11 rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-primary-deep"
        >
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-border-subtle bg-surface p-8 text-center text-text-secondary">
          {q ? `Nobody matches "${q}".` : "No one has contacted us through the site yet."}
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
