import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminUser, can } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { PrintButton } from "@/components/admin/print-button";
import { formatPhone, matchesQuery } from "@/lib/clients";
import { BRAND } from "@/config/site";
import { officeClock } from "@/lib/office-time";
import { loadClients, shortDate } from "../data";

/**
 * src/app/(admin)/admin/(protected)/clients/print/page.tsx
 *
 * Directorio en papel.
 *
 * Es la hoja más sensible del panel: todos los teléfonos y correos de
 * quien ha escrito, en una sola página. Por eso se genera desde una ruta
 * propia que deja registro de quién la sacó y cuándo, y el pie del papel
 * lleva ese mismo nombre: si aparece una copia en un mostrador, se sabe
 * de dónde salió.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "Clients — print" };

export default async function ClientsPrintPage({
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

  await logAudit({
    userId: user!.id,
    action: "client.directory_printed",
    objectType: "client",
    details: { count: rows.length, filtered: q.length > 0 },
  });

  const printedAt = new Date();

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <PrintButton />
        <Link href="/admin/clients" className="text-sm font-bold text-brand-primary hover:underline">
          Back to clients
        </Link>
        <span className="ml-auto text-sm text-text-secondary">
          Use Ctrl+P and choose &quot;Save as PDF&quot; to keep a copy.
        </span>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-8 print:rounded-none print:border-0 print:p-0">
        <header className="border-b-2 border-brand-primary pb-4">
          <h1 className="font-display text-2xl font-extrabold text-brand-primary">
            {BRAND.name} — Client directory
          </h1>
          <p className="mt-1 text-sm">
            <strong>{rows.length} people</strong>
            {q && ` matching “${q}”`} · printed {shortDate(printedAt.toISOString())} at{" "}
            {officeClock(printedAt)}
          </p>
        </header>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left">
              <th className="py-2 pr-3 font-bold">Name</th>
              <th className="py-2 pr-3 font-bold">Phone</th>
              <th className="py-2 pr-3 font-bold">Email</th>
              <th className="py-2 pr-3 font-bold">Office</th>
              <th className="py-2 pr-3 text-center font-bold">Req.</th>
              <th className="py-2 pr-3 text-center font-bold">Msg.</th>
              <th className="py-2 pr-3 font-bold">First</th>
              <th className="py-2 font-bold">Last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.key} className="border-b border-border-subtle align-top">
                <td className="py-2 pr-3 font-semibold">{c.name}</td>
                <td className="whitespace-nowrap py-2 pr-3">
                  {c.phones.map((p) => (
                    <span key={p} className="block">
                      {formatPhone(p)}
                    </span>
                  ))}
                  {c.phones.length === 0 && "—"}
                </td>
                <td className="py-2 pr-3">
                  {c.emails.map((e) => (
                    <span key={e} className="block break-all">
                      {e}
                    </span>
                  ))}
                  {c.emails.length === 0 && "—"}
                </td>
                <td className="py-2 pr-3">{c.offices.join(", ") || "—"}</td>
                <td className="py-2 pr-3 text-center tabular-nums">
                  {c.appointmentCount || "—"}
                </td>
                <td className="py-2 pr-3 text-center tabular-nums">
                  {c.messageCount || "—"}
                </td>
                <td className="whitespace-nowrap py-2 pr-3">{shortDate(c.firstSeen)}</td>
                <td className="whitespace-nowrap py-2">{shortDate(c.lastSeen)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="mt-6 border-t border-border-subtle pt-3 text-xs text-text-secondary">
          Printed by {user!.displayName} ({user!.email}). Contains patient contact
          details — destroy this copy when you are done with it.
        </footer>
      </div>
    </div>
  );
}
