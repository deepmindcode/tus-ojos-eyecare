import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAdminUser, can } from "@/lib/auth/roles";

/**
 * src/app/(admin)/admin/(protected)/audit/page.tsx
 *
 * Registro de auditoria. Solo dirección entra (`audit:read`).
 *
 * La tabla es inmutable por diseño: la base revoca update y delete, así
 * que nadie puede borrar su propio rastro, ni desde aquí ni desde el
 * panel de Supabase con la clave pública.
 *
 * No muestra datos de pacientes: dice QUÉ se hizo y QUIÉN lo hizo, no
 * sobre quién. Esa es la razón de que `details` nunca lleve nombres.
 */

export const dynamic = "force-dynamic";

const ACTION_STYLE: ReadonlyArray<readonly [string, string]> = [
  ["delete", "bg-[#FDF0F0] text-error"],
  ["archive", "bg-[#FDF0F0] text-error"],
  ["active", "bg-[#E3F3EA] text-success"],
  ["publish", "bg-[#E3F3EA] text-success"],
  ["created", "bg-brand-secondary-tint text-brand-secondary-deep"],
  ["updated", "bg-[#FBF0DC] text-[#7A5100]"],
  ["viewed", "bg-[#F1F1F1] text-text-secondary"],
  ["read", "bg-[#F1F1F1] text-text-secondary"],
];

function badge(action: string): string {
  const hit = ACTION_STYLE.find(([k]) => action.includes(k));
  return hit?.[1] ?? "bg-[#F1F1F1] text-text-secondary";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; days?: string }>;
}) {
  const user = await getAdminUser();
  if (!can(user, "audit:read")) redirect("/admin");

  const sp = await searchParams;
  const days = sp.days === "7" ? 7 : sp.days === "90" ? 90 : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("audit_logs")
    .select("id, user_id, action, object_type, object_id, result, details, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(400);

  if (sp.action) query = query.ilike("action", `${sp.action}%`);

  const { data, error } = await query;
  if (error) console.error("[admin] fallo cargando auditoría:", error);

  const rows = data ?? [];

  // Los correos se resuelven con la clave de servicio: `auth.users` no es
  // consultable desde el cliente normal. Se piden una sola vez y se
  // cruzan en memoria, en vez de una consulta por fila.
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
  const emails = new Map<string, string>();

  if (ids.length > 0) {
    const admin = createSupabaseAdminClient();
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const u of list?.users ?? []) {
      if (u.email) emails.set(u.id, u.email);
    }
  }

  const who = (id: string | null) =>
    id ? (emails.get(id) ?? `${id.slice(0, 8)}…`) : "sistema";

  return (
    <>
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-brand-primary">
          <ScrollText className="size-6" aria-hidden="true" />
          Audit log
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Last {days} days · {rows.length} entries · this log cannot be edited or deleted
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {[
          ["", "All"],
          ["appointment", "Appointments"],
          ["promotion", "Promotions"],
          ["message", "Messages"],
          ["user", "Users"],
          ["auth", "Sign-ins"],
        ].map(([value, label]) => (
          <a
            key={label}
            href={`/admin/audit?${new URLSearchParams({
              ...(value ? { action: value } : {}),
              days: String(days),
            })}`}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${
              (sp.action ?? "") === value
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-border-subtle bg-surface text-text-secondary hover:border-brand-secondary"
            }`}
          >
            {label}
          </a>
        ))}
        <span className="w-full" />
        {["7", "30", "90"].map((d) => (
          <a
            key={d}
            href={`/admin/audit?${new URLSearchParams({
              ...(sp.action ? { action: sp.action } : {}),
              days: d,
            })}`}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${
              String(days) === d
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-border-subtle bg-surface text-text-secondary hover:border-brand-secondary"
            }`}
          >
            {d} days
          </a>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border-subtle bg-surface p-10 text-center text-text-secondary">
          Nothing recorded in this period.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border-subtle bg-surface">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-secondary">
                  When
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Who
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Action
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Object
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id as string} className="border-b border-border-subtle last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                    {new Date(r.created_at as string).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 font-semibold">{who(r.user_id as string | null)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wider ${badge(
                        r.action as string,
                      )}`}
                    >
                      {(r.action as string).replace(/[._]/g, " ")}
                    </span>
                    {r.result === "failure" && (
                      <span className="ml-2 text-[0.7rem] font-bold uppercase text-error">
                        failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {r.object_type as string}
                    {r.object_id ? (
                      <span className="ml-1 opacity-60">
                        {(r.object_id as string).slice(0, 8)}…
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-[28ch] truncate px-4 py-3 text-text-secondary">
                    {Object.entries((r.details ?? {}) as Record<string, unknown>)
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}