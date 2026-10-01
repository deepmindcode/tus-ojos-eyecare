import { redirect } from "next/navigation";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminUser, can } from "@/lib/auth/roles";
import { InboxList } from "@/components/admin/inbox-list";
import { LOCATIONS } from "@/config/site";
import type { MessageStatus } from "./types";

/**
 * src/app/(admin)/admin/(protected)/inbox/page.tsx
 *
 * Mensajes del formulario de contacto. Las politicas RLS ya limitan las
 * filas por sede; el filtro de aqui es para trabajar, no para proteger.
 */

export const dynamic = "force-dynamic";

/** Un mensaje sin abrir en mas de 24 h es un cliente esperando. */
function waitingTooLong(status: string, createdAt: string): boolean {
  if (!["UNREAD", "READ"].includes(status)) return false;
  return (Date.now() - new Date(createdAt).getTime()) / 3_600_000 > 24;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; location?: string }>;
}) {
  const user = await getAdminUser();
  if (!can(user, "messages:read")) redirect("/admin");

  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("contact_messages")
    .select(
      "id, name, email, phone, subject, message, status, created_at, location_id, locations(slug, city)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (sp.status) query = query.eq("status", sp.status);

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

  return (
    <>
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-brand-primary">
          <Inbox className="size-6" aria-hidden="true" />
          Messages
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          From the website contact form · {rows.length} shown
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Chip label="All offices" active={!sp.location} params={{ ...sp, location: undefined }} />
        {LOCATIONS.filter((l) => l.active).map((l) => (
          <Chip
            key={l.id}
            label={l.city}
            active={sp.location === l.slug}
            params={{ ...sp, location: l.slug }}
          />
        ))}
        <span className="w-full" />
        <Chip label="All statuses" active={!sp.status} params={{ ...sp, status: undefined }} />
        {["UNREAD", "IN_PROGRESS", "REPLIED", "CLOSED", "SPAM"].map((s) => (
          <Chip
            key={s}
            label={s.replace(/_/g, " ").toLowerCase()}
            active={sp.status === s}
            params={{ ...sp, status: s }}
          />
        ))}
      </div>

      <div className="mt-6">
        <InboxList rows={rows} canReply={can(user, "messages:reply")} />
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