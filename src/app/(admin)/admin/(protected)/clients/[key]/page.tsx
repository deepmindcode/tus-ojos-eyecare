import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Mail, MapPin, MessageSquare, Phone, Tag } from "lucide-react";
import { getAdminUser, can } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { PrintButton } from "@/components/admin/print-button";
import { formatPhone } from "@/lib/clients";
import { BRAND } from "@/config/site";
import { loadClients, longDate, shortDate, humanize } from "../data";

/**
 * src/app/(admin)/admin/(protected)/clients/[key]/page.tsx
 *
 * Ficha de una persona: sus datos y TODO lo que ha enviado, de lo más
 * reciente a lo más antiguo. Cada envío es una entrada; nada se
 * sobrescribe cuando vuelve a pedir cita.
 *
 * Abrir la ficha queda registrado. Es la pantalla con el motivo de
 * consulta y el teléfono de una persona concreta, y si algún día alguien
 * pregunta quién consultó ese expediente, la respuesta tiene que existir.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "Client" };

export default async function ClientPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const user = await getAdminUser();
  if (!can(user, "clients:read")) redirect("/admin");

  const { key } = await params;
  const decoded = decodeURIComponent(key);

  const all = await loadClients();
  // Puede entrar por la clave del grupo o por cualquiera de sus
  // identificadores: así un enlace guardado sigue funcionando aunque el
  // grupo haya crecido y la clave haya cambiado.
  const client =
    all.find((c) => c.key === decoded) ??
    all.find(
      (c) =>
        c.phones.some((p) => `p:${p}` === decoded) ||
        c.emails.some((e) => `e:${e}` === decoded),
    );

  if (!client) notFound();

  await logAudit({
    userId: user!.id,
    action: "client.profile_viewed",
    objectType: "client",
    objectId: client.key,
    details: { events: client.events.length },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All clients
        </Link>
        <span className="ml-auto">
          <PrintButton />
        </span>
      </div>

      <header className="mt-5 rounded-2xl border border-border-subtle bg-surface p-6 print:rounded-none print:border-0 print:p-0">
        <p className="hidden text-sm font-bold text-brand-primary print:block">
          {BRAND.name} — client record
        </p>

        <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-primary">
          {client.name}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          First contact {shortDate(client.firstSeen)} · most recent{" "}
          {shortDate(client.lastSeen)}
        </p>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field icon={Phone} label="Phone">
            {client.phones.length > 0
              ? client.phones.map((p) => (
                  <a
                    key={p}
                    href={`tel:+1${p}`}
                    className="block font-semibold text-brand-secondary-deep hover:underline"
                  >
                    {formatPhone(p)}
                  </a>
                ))
              : "—"}
          </Field>

          <Field icon={Mail} label="Email">
            {client.emails.length > 0
              ? client.emails.map((e) => (
                  <a
                    key={e}
                    href={`mailto:${e}`}
                    className="block break-all font-semibold text-brand-secondary-deep hover:underline"
                  >
                    {e}
                  </a>
                ))
              : "—"}
          </Field>

          <Field icon={MapPin} label="Offices used">
            {client.offices.join(", ") || "—"}
          </Field>

          <Field icon={CalendarDays} label="Activity">
            {client.appointmentCount} appointment{client.appointmentCount === 1 ? "" : "s"} ·{" "}
            {client.messageCount} message{client.messageCount === 1 ? "" : "s"}
          </Field>
        </dl>
      </header>

      <h2 className="mt-10 font-display text-lg font-extrabold tracking-tight text-brand-primary">
        History · {client.events.length} entries
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Newest first. Nothing is overwritten when the same person writes again.
      </p>

      <ol className="mt-5 space-y-4">
        {client.events.map((e) => {
          const isAppt = e.kind === "appointment";
          const Icon = isAppt ? CalendarDays : MessageSquare;

          return (
            <li
              key={`${e.kind}-${e.id}`}
              className="rounded-2xl border border-border-subtle bg-surface p-5 print:break-inside-avoid"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                    isAppt
                      ? "bg-brand-primary-tint text-brand-primary"
                      : "bg-brand-secondary-tint text-brand-secondary-deep"
                  }`}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {isAppt ? "Appointment request" : "Message"}
                </span>
                <time className="text-sm font-semibold">{longDate(e.at)}</time>
                {e.office && (
                  <span className="text-sm text-text-secondary">· {e.office}</span>
                )}
                <span className="ml-auto rounded-full border border-border-subtle px-2.5 py-1 text-xs font-bold capitalize text-text-secondary">
                  {humanize(e.status)}
                </span>
              </div>

              <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Row label={isAppt ? "Reason" : "Subject"} value={humanize(e.reason)} />
                {isAppt && (
                  <>
                    <Row
                      label="Preferred"
                      value={
                        e.preferredDate
                          ? `${e.preferredDate}${e.preferredTime ? ` · ${humanize(e.preferredTime)}` : ""}`
                          : "No preference"
                      }
                    />
                    <Row label="Prefers contact by" value={humanize(e.contactPreference)} />
                    <Row
                      label="Patient"
                      value={e.patientStatus === "existing" ? "Returning" : "New"}
                    />
                  </>
                )}
              </dl>

              {e.promotionLabel && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-900">
                  <Tag className="size-4" aria-hidden="true" />
                  {e.promotionLabel}
                </p>
              )}

              {e.detail && (
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-background p-3 text-sm leading-relaxed text-text-secondary">
                  {e.detail}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-8 border-t border-border-subtle pt-4 text-xs text-text-secondary">
        Printed from the Tus Ojos admin panel by {user!.displayName}. This page
        contains patient contact details — do not leave a copy unattended.
      </p>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  readonly icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand-secondary" aria-hidden={true} />
      <div>
        <dt className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm">{children}</dd>
      </div>
    </div>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-text-secondary">
        {label}
      </dt>
      <dd className="mt-0.5 capitalize">{value}</dd>
    </div>
  );
}
