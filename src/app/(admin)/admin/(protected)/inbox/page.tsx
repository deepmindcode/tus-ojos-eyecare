import { redirect } from "next/navigation";
import Link from "next/link";
import { Inbox, Archive } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminUser, can } from "@/lib/auth/roles";
import { InboxList } from "@/components/admin/inbox-list";
import { RefreshBar } from "@/components/admin/refresh-bar";
import { officeClock } from "@/lib/office-time";
import { LOCATIONS } from "@/config/site";
import type { MessageStatus } from "./types";

/**
 * src/app/(admin)/admin/(protected)/inbox/page.tsx
 *
 * Mensajes del formulario de contacto. Las politicas RLS ya limitan las
 * filas por sede; el filtro de aqui es para trabajar, no para proteger.
 *
 * Por defecto solo se ve lo VIVO: nada archivado, y ni cerrados ni spam.
 * Una bandeja que lo muestra todo deja de servir a los dos meses.
 */

export const dynamic = "force-dynamic";

/** Lo que todavia pide atencion. */
const ACTIVE: MessageStatus[] = ["UNREAD", "READ", "IN_PROGRESS"];

/** Un mensaje sin abrir en mas de 24 h es un cliente esperando. */
function waitingTooLong(status: string, createdAt: string): boolean {
  if (!["UNREAD", "READ"].includes(status)) return false;
  return (Date.now() - new Date(createdAt).getTime()) / 3_600_000 > 24;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; location?: string; view?: string }>;
}) {
  const user = await getAdminUser();
  if (!can(user, "messages:read")) redirect("/admin");

  const sp = await searchParams;
  const archivedView = sp.view === "archived";
  const allView = sp.view === "all";

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("contact_messages")
    .select(
      "id, name, email, phone, subject, message, status, created_at, archived_at, location_id, locations(slug, city)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  // Archivado es un eje aparte del estado: algo cerrado no esta
  // archivado hasta que alguien lo archiva.
  query = archivedView ? query.not("archived_at", "is", null) : query.is("archived_at", null);

  if (sp.status) {
    query = query.eq("status", sp.status);
  } else if (!archivedView && !allView) {
    query = query.in("status", ACTIVE);
  }

  const { data, error } = await query;
  if (error) console.error("[admin] fallo cargando mensajes:", error);

  const all = data ?? [];

  const rows = (
    sp.location
      ? all.filter(
          (r) => (r.locations as unknown as { slug: string } | null)?.slug === sp.location,
        )
      : all
  ).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    email: r.email as string,
    phone: (r.phone as string) ?? null,
    city: (r.locations as unknown as { city: string } | null)?.city ?? "—",
    subject: r.subject as string,
    message: r.message as string,
    status: r.status as MessageStatus,
    createdAt: r.created_at as string,
    stale: waitingTooLong(r.status as string, r.created_at as string),
  }));

  // Solo direccion puede destruir un mensaje.
  const canDelete = ["SUPER_ADMIN", "OWNER"].some((role) =>
    user!.roles.includes(role as never),
  );

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-brand-primary">
            {archivedView ? (
              <Archive className="size-6" aria-hidden="true" />
            ) : (
              <Inbox className="size-6" aria-hidden="true" />
            )}
            {archivedView ? "Archived messages" : "Messages"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {archivedView
              ? `${rows.length} archived · nothing here is deleted`
              : `From the website contact form · ${rows.length} shown`}
          </p>
        </div>

        {/* Un mensaje nuevo no avisa por si solo; esto lo trae sin que
            nadie recargue. */}
        <RefreshBar updatedAt={officeClock()} label="Updated" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Chip label="Inbox" active={!archivedView && !allView && !sp.status} params={{}} />
        <Chip
          label="Everything"
          active={allView}
          params={{ ...sp, view: "all", status: undefined }}
        />
        <Chip
          label="Archived"
          active={archivedView}
          params={{ ...sp, view: "archived", status: undefined }}
        />

        <span className="w-full" />

        <Chip
          label="All offices"
          active={!sp.location}
          params={{ ...sp, location: undefined }}
        />
        {LOCATIONS.filter((l) => l.active).map((l) => (
          <Chip
            key={l.id}
            label={l.city}
            active={sp.location === l.slug}
            params={{ ...sp, location: l.slug }}
          />
        ))}

        <span className="w-full" />

        {["UNREAD", "IN_PROGRESS", "REPLIED", "CLOSED", "SPAM"].map((s) => (
          <Chip
            key={s}
            label={s.replace(/_/g, " ").toLowerCase()}
            active={sp.status === s}
            params={{ ...sp, status: s, view: undefined }}
          />
        ))}
      </div>

      <div className="mt-6">
        <InboxList
          rows={rows}
          canReply={can(user, "messages:reply")}
          canDelete={canDelete}
          archivedView={archivedView}
        />
      </div>
    </>
  );
}

function Chip({
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
      href={`/admin/inbox${qs ? `?${qs}` : ""}`}
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