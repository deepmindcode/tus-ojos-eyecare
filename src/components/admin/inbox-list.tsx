"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Mail, Phone, Loader2, Inbox } from "lucide-react";
import {
  openMessage,
  setMessageStatus,
} from "@/app/(admin)/admin/(protected)/inbox/actions";
import type {
  MessageRow,
  MessageStatus,
} from "@/app/(admin)/admin/(protected)/inbox/types";

/**
 * src/components/admin/inbox-list.tsx
 *
 * No enviamos el correo desde aquí: abrimos el cliente de correo de quien
 * atiende, con el asunto ya puesto. Es deliberado. Responder desde el
 * servidor obligaría a guardar el texto de la respuesta en la base, y una
 * respuesta sobre la vista de alguien no tiene por qué vivir ahí.
 */

const STATUSES: ReadonlyArray<readonly [MessageStatus, string]> = [
  ["READ", "read"],
  ["IN_PROGRESS", "in progress"],
  ["REPLIED", "replied"],
  ["CLOSED", "closed"],
  ["SPAM", "spam"],
];

const BADGE: Record<MessageStatus, string> = {
  UNREAD: "bg-brand-primary text-white",
  READ: "bg-[#F1F1F1] text-text-secondary",
  IN_PROGRESS: "bg-[#FBF0DC] text-[#7A5100]",
  REPLIED: "bg-[#E3F3EA] text-success",
  CLOSED: "bg-[#F1F1F1] text-text-secondary",
  SPAM: "bg-[#FDF0F0] text-error",
};

export function InboxList({
  rows,
  canReply,
}: {
  readonly rows: readonly MessageRow[];
  readonly canReply: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [override, setOverride] = useState<Record<string, MessageStatus>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(row: MessageRow) {
    const opening = expanded !== row.id;
    setExpanded(opening ? row.id : null);
    if (!opening) return;

    // Abrirlo lo marca leído y lo registra en la auditoría.
    if ((override[row.id] ?? row.status) === "UNREAD") {
      setOverride((p) => ({ ...p, [row.id]: "READ" }));
      startTransition(() => {
        void openMessage(row.id);
      });
    }
  }

  function change(id: string, status: MessageStatus, current: MessageStatus) {
    setBusyId(id);
    setOverride((p) => ({ ...p, [id]: status }));
    startTransition(async () => {
      const res = await setMessageStatus(id, status);
      if (!res.ok) setOverride((p) => ({ ...p, [id]: current }));
      setBusyId(null);
    });
  }

  const unread = rows.filter((r) => (override[r.id] ?? r.status) === "UNREAD").length;
  const working = rows.filter((r) => (override[r.id] ?? r.status) === "IN_PROGRESS").length;
  const waiting = rows.filter(
    (r) => r.stale && ["UNREAD", "READ"].includes(override[r.id] ?? r.status),
  ).length;

  const stats = [
    { label: "Unread", value: unread, accent: true },
    { label: "Waiting over 24h", value: waiting, warn: true },
    { label: "In progress", value: working },
    { label: "Total", value: rows.length },
  ];

  return (
    <>
      <dl className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((c) => (
          <div
            key={c.label}
            className={`rounded-2xl border p-4 ${
              c.warn && c.value > 0
                ? "border-error bg-[#FDF0F0]"
                : c.accent && c.value > 0
                  ? "border-brand-primary bg-brand-primary-tint"
                  : "border-border-subtle bg-surface"
            }`}
          >
            <dt className="text-sm text-text-secondary">{c.label}</dt>
            <dd
              className={`font-display text-3xl font-bold ${
                c.warn && c.value > 0 ? "text-error" : "text-brand-primary"
              }`}
            >
              {c.value}
            </dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <p className="flex flex-col items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-10 text-center text-text-secondary">
          <Inbox className="size-8 opacity-40" aria-hidden="true" />
          No messages match these filters.
        </p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((r) => {
            const open = expanded === r.id;
            const status = override[r.id] ?? r.status;
            return (
              <li
                key={r.id}
                className="overflow-hidden rounded-2xl border border-border-subtle bg-surface"
              >
                <button
                  type="button"
                  onClick={() => toggle(r)}
                  aria-expanded={open}
                  className={`flex w-full flex-wrap items-center gap-3 p-4 text-left hover:bg-background ${
                    r.stale && ["UNREAD", "READ"].includes(status)
                      ? "border-l-4 border-error"
                      : ""
                  }`}
                >
                  <span
                    className={`rounded px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${BADGE[status]}`}
                  >
                    {status.replace(/_/g, " ").toLowerCase()}
                  </span>

                  <span
                    className={status === "UNREAD" ? "font-display font-extrabold" : "font-display font-bold"}
                  >
                    {r.name}
                  </span>

                  <span className="text-sm text-text-secondary">{r.city}</span>

                  <span className="max-w-[32ch] truncate text-sm text-text-secondary">
                    {r.subject}
                  </span>

                  <span className="ml-auto text-sm text-text-secondary">
                    {new Date(r.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>

                  <ChevronDown
                    className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>

                {open && (
                  <div className="border-t border-border-subtle bg-background p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                      Message
                    </h3>
                    {/* `whitespace-pre-line` conserva los saltos tal como
                        los escribió la persona. */}
                    <p className="mt-2 whitespace-pre-line rounded-xl bg-surface p-4 text-sm">
                      {r.message}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.subject}`)}`}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-border-subtle bg-surface px-4 text-sm font-bold text-brand-secondary-deep"
                      >
                        <Mail className="size-4" aria-hidden="true" />
                        {r.email}
                      </a>
                      {r.phone && (
                        <a
                          href={`tel:${r.phone}`}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-border-subtle bg-surface px-4 text-sm font-bold text-brand-secondary-deep"
                        >
                          <Phone className="size-4" aria-hidden="true" />
                          {r.phone}
                        </a>
                      )}
                    </div>

                    {canReply && (
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                          Set status
                        </span>
                        {busyId === r.id && (
                          <Loader2
                            className="size-4 animate-spin text-brand-primary"
                            aria-hidden="true"
                          />
                        )}
                        {STATUSES.map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            disabled={value === status || busyId === r.id}
                            onClick={() => change(r.id, value, status)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${
                              value === status
                                ? "border-brand-primary bg-brand-primary text-white"
                                : "border-border-subtle bg-surface hover:border-brand-primary"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}