"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown,
  Mail,
  Phone,
  Loader2,
  Inbox,
  Archive,
  ArchiveRestore,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  openMessage,
  setMessageStatus,
  archiveMessages,
  unarchiveMessages,
  deleteMessages,
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
 *
 * Archivar y borrar son cosas distintas a propósito: archivar saca de la
 * vista y se puede deshacer; borrar destruye y solo lo puede hacer
 * dirección.
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
  canDelete,
  archivedView,
}: {
  readonly rows: readonly MessageRow[];
  readonly canReply: boolean;
  readonly canDelete: boolean;
  readonly archivedView: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [override, setOverride] = useState<Record<string, MessageStatus>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [, startTransition] = useTransition();

  const visible = rows.filter((r) => !gone.has(r.id));

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

  function pick(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    setConfirmDelete(false);
  }

  function pickAll(on: boolean) {
    setSelected(on ? new Set(visible.map((r) => r.id)) : new Set());
    setConfirmDelete(false);
  }

  /** Las tres acciones en lote comparten el mismo patrón optimista. */
  function bulk(action: "archive" | "unarchive" | "delete") {
    const ids = [...selected];
    if (ids.length === 0) return;

    setBulkBusy(true);
    // Desaparecen de la lista al instante; si el servidor falla, vuelven.
    setGone((p) => new Set([...p, ...ids]));

    startTransition(async () => {
      const res =
        action === "archive"
          ? await archiveMessages(ids)
          : action === "unarchive"
            ? await unarchiveMessages(ids)
            : await deleteMessages(ids);

      if (!res.ok) {
        setGone((p) => {
          const next = new Set(p);
          for (const id of ids) next.delete(id);
          return next;
        });
      }

      setSelected(new Set());
      setConfirmDelete(false);
      setBulkBusy(false);
    });
  }

  const unread = visible.filter((r) => (override[r.id] ?? r.status) === "UNREAD").length;
  const working = visible.filter(
    (r) => (override[r.id] ?? r.status) === "IN_PROGRESS",
  ).length;
  const waiting = visible.filter(
    (r) => r.stale && ["UNREAD", "READ"].includes(override[r.id] ?? r.status),
  ).length;

  const stats = [
    { label: "Unread", value: unread, accent: true },
    { label: "Waiting over 24h", value: waiting, warn: true },
    { label: "In progress", value: working },
    { label: "Shown", value: visible.length },
  ];

  const allPicked = visible.length > 0 && selected.size === visible.length;

  return (
    <>
      {!archivedView && (
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
      )}

      {/* Barra de acciones en lote. Aparece solo con algo seleccionado:
          una barra siempre visible con botones inertes es ruido. */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-brand-primary bg-brand-primary-tint p-3">
          <span className="text-sm font-bold text-brand-primary">
            {selected.size} seleccionado{selected.size === 1 ? "" : "s"}
          </span>

          {bulkBusy && (
            <Loader2 className="size-4 animate-spin text-brand-primary" aria-hidden="true" />
          )}

          <div className="ml-auto flex flex-wrap gap-2">
            {canReply && !archivedView && (
              <button
                type="button"
                onClick={() => bulk("archive")}
                disabled={bulkBusy}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-surface px-4 text-sm font-bold hover:bg-background disabled:opacity-50"
              >
                <Archive className="size-4" aria-hidden="true" />
                Archivar
              </button>
            )}

            {canReply && archivedView && (
              <button
                type="button"
                onClick={() => bulk("unarchive")}
                disabled={bulkBusy}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-surface px-4 text-sm font-bold hover:bg-background disabled:opacity-50"
              >
                <ArchiveRestore className="size-4" aria-hidden="true" />
                Devolver a la bandeja
              </button>
            )}

            {canDelete &&
              (confirmDelete ? (
                <>
                  <button
                    type="button"
                    onClick={() => bulk("delete")}
                    disabled={bulkBusy}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-error px-4 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <AlertTriangle className="size-4" aria-hidden="true" />
                    Sí, borrar para siempre
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={bulkBusy}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-error px-4 text-sm font-bold text-error hover:bg-[#FDF0F0] disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Borrar
                </button>
              ))}

            <button
              type="button"
              onClick={() => pickAll(false)}
              className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold text-text-secondary"
            >
              Quitar selección
            </button>
          </div>

          {confirmDelete && (
            <p className="w-full text-sm text-error">
              Esto destruye {selected.size} mensaje{selected.size === 1 ? "" : "s"} y no se
              puede deshacer. Si es correo de un paciente, archívalo en vez de borrarlo.
            </p>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="flex flex-col items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-10 text-center text-text-secondary">
          <Inbox className="size-8 opacity-40" aria-hidden="true" />
          {archivedView ? "No hay mensajes archivados." : "No messages match these filters."}
        </p>
      ) : (
        <>
          <label className="mb-2 flex w-fit cursor-pointer items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={allPicked}
              onChange={(e) => pickAll(e.target.checked)}
              className="size-4 accent-[var(--color-brand-primary)]"
            />
            Seleccionar todo
          </label>

          <ul className="grid gap-2">
            {visible.map((r) => {
              const open = expanded === r.id;
              const status = override[r.id] ?? r.status;
              const picked = selected.has(r.id);

              return (
                <li
                  key={r.id}
                  className={`overflow-hidden rounded-2xl border bg-surface ${
                    picked ? "border-brand-primary" : "border-border-subtle"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 pl-4 ${
                      r.stale && ["UNREAD", "READ"].includes(status) && !archivedView
                        ? "border-l-4 border-error"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={picked}
                      onChange={(e) => pick(r.id, e.target.checked)}
                      aria-label={`Seleccionar mensaje de ${r.name}`}
                      className="size-4 shrink-0 accent-[var(--color-brand-primary)]"
                    />

                    <button
                      type="button"
                      onClick={() => toggle(r)}
                      aria-expanded={open}
                      className="flex min-w-0 flex-1 flex-wrap items-center gap-3 py-4 pr-4 text-left hover:bg-background"
                    >
                      <span
                        className={`rounded px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${BADGE[status]}`}
                      >
                        {status.replace(/_/g, " ").toLowerCase()}
                      </span>

                      <span
                        className={
                          status === "UNREAD"
                            ? "font-display font-extrabold"
                            : "font-display font-bold"
                        }
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
                  </div>

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

                      {canReply && !archivedView && (
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
        </>
      )}
    </>
  );
}