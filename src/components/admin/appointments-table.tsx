"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown,
  Phone,
  MessageSquare,
  Mail,
  Loader2,
  Clock,
  Tag,
  NotebookPen,
} from "lucide-react";
import {
  updateAppointmentStatus,
  getAppointmentActivity,
  addAppointmentNote,
  type ActivityEntry,
} from "@/app/(admin)/admin/(protected)/actions";

export interface AppointmentRow {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string | null;
  readonly city: string;
  readonly reason: string;
  readonly patientStatus: string;
  readonly preferredDate: string | null;
  readonly preferredTime: string | null;
  readonly notes: string | null;
  /**
   * Descuento que este paciente está pidiendo, si llegó desde una
   * promoción. Es una copia del texto en el momento de la solicitud: si
   * la promoción se edita después, esta cita sigue diciendo qué se le
   * prometió a ESTA persona.
   */
  readonly promotionLabel: string | null;
  readonly commPref: string;
  readonly smsConsent: boolean;
  readonly status: string;
  readonly createdAt: string;
  /** Lleva demasiado tiempo sin que nadie la mueva */
  readonly stale: boolean;
}

const STATUSES = [
  "NEW",
  "CONTACT_ATTEMPTED",
  "PATIENT_REACHED",
  "CONFIRMED",
  "RESCHEDULE_REQUESTED",
  "CANCELLED",
  "COMPLETED",
  "NO_RESPONSE",
  "SPAM",
  // Historico del sitio anterior. No es trabajo pendiente: nadie tiene
  // que llamar a nadie por una solicitud de hace meses ya atendida.
  "IMPORTED",
] as const;

const BADGE: Record<string, string> = {
  NEW: "bg-brand-primary text-white",
  CONTACT_ATTEMPTED: "bg-[#FBF0DC] text-[#7A5100]",
  PATIENT_REACHED: "bg-brand-secondary-tint text-brand-secondary-deep",
  CONFIRMED: "bg-[#E3F3EA] text-success",
  RESCHEDULE_REQUESTED: "bg-[#FBF0DC] text-[#7A5100]",
  CANCELLED: "bg-[#F1F1F1] text-text-secondary",
  COMPLETED: "bg-[#E3F3EA] text-success",
  NO_RESPONSE: "bg-[#F1F1F1] text-text-secondary",
  SPAM: "bg-[#FDF0F0] text-error",
  IMPORTED: "bg-[#F1F1F1] text-text-secondary",
};

function label(s: string) {
  return s.replace(/_/g, " ").toLowerCase();
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AppointmentsTable({
  rows,
  canUpdate,
  todayCount,
}: {
  readonly rows: readonly AppointmentRow[];
  readonly canUpdate: boolean;
  readonly todayCount: number;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activity, setActivity] = useState<Record<string, ActivityEntry[]>>({});
  // Estado mostrado de inmediato al pulsar, antes de que el servidor
  // confirme. Sin esto, cada clic espera a que se rehaga toda la página.
  const [override, setOverride] = useState<Record<string, string>>({});

  // Lo que se está escribiendo en la nota, por ficha. Se guarda por id y
  // no en una sola variable: quien abre dos fichas no debe encontrarse el
  // borrador de la otra.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<Record<string, string>>({});

  function saveNote(id: string) {
    const text = (draft[id] ?? "").trim();
    if (text.length === 0) return;
    setSavingNote(id);
    setNoteError((p) => ({ ...p, [id]: "" }));

    startTransition(async () => {
      const res = await addAppointmentNote(id, text);
      if (res.ok) {
        setActivity((prev) => ({ ...prev, [id]: [res.entry, ...(prev[id] ?? [])] }));
        setDraft((prev) => ({ ...prev, [id]: "" }));
      } else {
        // El texto NO se borra si falla. Quien acaba de escribir tres
        // líneas sobre una llamada no debería tener que recordarlas.
        setNoteError((p) => ({
          ...p,
          [id]:
            res.error === "tooLong"
              ? "Too long — keep it under 2000 characters."
              : "Could not save. Try again.",
        }));
      }
      setSavingNote(null);
    });
  }

  async function toggle(row: AppointmentRow) {
    const opening = expanded !== row.id;
    setExpanded(opening ? row.id : null);
    if (!opening) return;

    // Una sola llamada: devuelve el historial y registra la consulta
    // en la auditoría desde el servidor.
    const entries = await getAppointmentActivity(row.id);
    setActivity((prev) => ({ ...prev, [row.id]: entries }));
  }

  function changeStatus(id: string, status: string, current: string) {
    setBusyId(id);
    setOverride((prev) => ({ ...prev, [id]: status }));

    startTransition(async () => {
      const res = await updateAppointmentStatus(id, status);
      if (res.ok) {
        // La acción devuelve la entrada nueva: no hay que volver a
        // pedir el historial completo al servidor.
        setActivity((prev) => ({ ...prev, [id]: [res.entry, ...(prev[id] ?? [])] }));
      } else {
        // Revertir si el servidor lo rechaza
        setOverride((prev) => ({ ...prev, [id]: current }));
      }
      setBusyId(null);
    });
  }

  // Se recalculan con los cambios optimistas aplicados, así las tarjetas
  // se mueven en el mismo instante que la etiqueta de la fila.
  const stats = [
    {
      label: "New",
      value: rows.filter((r) => (override[r.id] ?? r.status) === "NEW").length,
      accent: true,
    },
    {
      label: "Needs follow-up",
      value: rows.filter((r) => r.stale && (override[r.id] ?? r.status) === r.status).length,
      warn: true,
    },
    {
      label: "Confirmed",
      value: rows.filter((r) => (override[r.id] ?? r.status) === "CONFIRMED").length,
    },
    { label: "Today", value: todayCount },
  ];

  const statCards = (
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
  );

  if (rows.length === 0) {
    return (
      <>
        {statCards}
        <p className="rounded-2xl border border-border-subtle bg-surface p-10 text-center text-text-secondary">
          No requests match these filters.
        </p>
      </>
    );
  }

  return (
    <>
      {statCards}
      <ul className="grid gap-2">
      {rows.map((r) => {
        const open = expanded === r.id;
        const status = override[r.id] ?? r.status;
        return (
          <li key={r.id} className="overflow-hidden rounded-2xl border border-border-subtle bg-surface">
            <button
              type="button"
              onClick={() => void toggle(r)}
              aria-expanded={open}
              className={`flex w-full flex-wrap items-center gap-3 p-4 text-left hover:bg-background ${
                r.stale ? "border-l-4 border-error" : ""
              }`}
            >
              <span
                className={`rounded px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${BADGE[status] ?? ""}`}
              >
                {label(status)}
              </span>

              <span className="font-display font-bold">{r.name}</span>

              <span className="text-sm text-text-secondary">{r.city}</span>

              <span className="text-sm text-text-secondary">{label(r.reason)}</span>

              {r.patientStatus === "existing" && (
                <span className="rounded bg-brand-secondary-tint px-2 py-0.5 text-[0.65rem] font-bold uppercase text-brand-secondary-deep">
                  returning
                </span>
              )}

              {/* Visible sin abrir la ficha: quien llama necesita saber
                  que hay un descuento en juego antes de marcar. */}
              {r.promotionLabel && (
                <span className="inline-flex items-center gap-1 rounded bg-brand-primary-tint px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-brand-primary">
                  <Tag className="size-3" aria-hidden="true" />
                  discount
                </span>
              )}

              {r.stale && (
                <span className="rounded bg-[#FDF0F0] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-error">
                  needs follow-up
                </span>
              )}

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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                      Contact
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={`tel:${r.phone}`}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-border-subtle bg-surface px-4 text-sm font-bold text-brand-secondary-deep"
                      >
                        <Phone className="size-4" aria-hidden="true" />
                        {r.phone}
                      </a>
                      {/* Sólo ofrecemos escribir si dio consentimiento SMS */}
                      {r.smsConsent && (
                        <a
                          href={`sms:${r.phone}`}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-border-subtle bg-surface px-4 text-sm font-bold text-brand-secondary-deep"
                        >
                          <MessageSquare className="size-4" aria-hidden="true" />
                          Text
                        </a>
                      )}
                      {r.email && (
                        <a
                          href={`mailto:${r.email}`}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-border-subtle bg-surface px-4 text-sm font-bold text-brand-secondary-deep"
                        >
                          <Mail className="size-4" aria-hidden="true" />
                          {r.email}
                        </a>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-text-secondary">
                      Prefers: <strong>{label(r.commPref)}</strong>
                      {!r.smsConsent && r.commPref === "TEXT" && (
                        <span className="text-error"> · no SMS consent on file</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                      Requested
                    </h3>
                    <p className="mt-2 text-sm">
                      {r.preferredDate ?? "No date given"}
                      {r.preferredTime ? ` · ${r.preferredTime}` : ""}
                    </p>
                    {r.notes && (
                      <p className="mt-2 rounded-xl bg-surface p-3 text-sm text-text-secondary">
                        {r.notes}
                      </p>
                    )}

                    {/* El texto exacto del descuento, tal como lo vio el
                        paciente. Es lo que recepción lee en voz alta. */}
                    {r.promotionLabel && (
                      <div className="mt-2 rounded-xl border-l-[3px] border-brand-secondary bg-surface p-3">
                        <span className="block text-xs font-bold uppercase tracking-wider text-brand-secondary-deep">
                          Discount requested
                        </span>
                        <strong className="mt-1 block text-sm">{r.promotionLabel}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rastro de seguimiento: quién contactó y cuándo.
                    Es lo que permite a dirección supervisar sin preguntar. */}
                <div className="mt-4 border-t border-border-subtle pt-4">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary">
                    <Clock className="size-3.5" aria-hidden="true" />
                    Follow-up history
                  </h3>
                  {activity[r.id] === undefined ? (
                    <p className="mt-2 text-sm text-text-secondary">Loading…</p>
                  ) : activity[r.id]!.length === 0 ? (
                    <p className="mt-2 text-sm text-text-secondary">
                      No one has worked this request yet.
                    </p>
                  ) : (
                    <ol className="mt-2 grid gap-1.5">
                      {activity[r.id]!.map((a, i) =>
                        a.action === "note" ? (
                          /* Una nota ocupa su propio bloque: es texto que
                             alguien escribió a mano y hay que poder leerlo
                             entero, no de refilón en una línea. */
                          <li
                            key={i}
                            className="rounded-xl border-l-[3px] border-brand-secondary bg-surface p-3"
                          >
                            <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                              <span className="font-semibold">{a.who}</span>
                              <span className="text-xs text-text-secondary">wrote a note</span>
                              <span className="ml-auto text-xs text-text-secondary">
                                {when(a.at)}
                              </span>
                            </div>
                            <p className="mt-1.5 whitespace-pre-wrap text-sm">{a.to}</p>
                          </li>
                        ) : (
                          <li key={i} className="flex flex-wrap gap-x-2 text-sm">
                            <span className="font-semibold">{a.who}</span>
                            <span className="text-text-secondary">
                              {a.from ? `${label(a.from)} → ` : ""}
                              <strong className="text-text-primary">{label(a.to ?? "")}</strong>
                            </span>
                            <span className="ml-auto text-text-secondary">{when(a.at)}</span>
                          </li>
                        ),
                      )}
                    </ol>
                  )}

                  {/* El cuaderno de la llamada. Va JUNTO al historial y no
                      en otra pestaña: se escribe mirando lo que ya pasó. */}
                  {canUpdate && (
                    <div className="mt-3">
                      <label
                        htmlFor={`note-${r.id}`}
                        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary"
                      >
                        <NotebookPen className="size-3.5" aria-hidden="true" />
                        Add a note
                      </label>
                      <textarea
                        id={`note-${r.id}`}
                        rows={3}
                        value={draft[r.id] ?? ""}
                        onChange={(e) => setDraft((p) => ({ ...p, [r.id]: e.target.value }))}
                        placeholder="What came out of the call. Example: called at 2pm, no answer, left voicemail. Or: wants Saturday morning, asked about the discount."
                        className="mt-1.5 w-full resize-y rounded-xl border-2 border-border-subtle bg-surface p-3 text-sm focus:border-brand-primary focus:outline-none"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => saveNote(r.id)}
                          disabled={
                            savingNote === r.id || (draft[r.id] ?? "").trim().length === 0
                          }
                          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-secondary px-5 text-sm font-bold text-white hover:bg-brand-secondary-deep disabled:opacity-40"
                        >
                          {savingNote === r.id && (
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          )}
                          Save note
                        </button>
                        {noteError[r.id] ? (
                          <span className="text-sm font-semibold text-error">
                            {noteError[r.id]}
                          </span>
                        ) : (
                          <span className="text-xs text-text-secondary">
                            Saved with your name and the time. Notes cannot be edited or
                            deleted — to correct one, add another.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {canUpdate && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                      Set status
                    </span>
                    {busyId === r.id && (
                      <Loader2 className="size-4 animate-spin text-brand-primary" aria-hidden="true" />
                    )}
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={s === status || busyId === r.id}
                        onClick={() => changeStatus(r.id, s, status)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold capitalize disabled:opacity-40 ${
                          s === status
                            ? "border-brand-primary bg-brand-primary text-white"
                            : "border-border-subtle bg-surface hover:border-brand-primary"
                        }`}
                      >
                        {label(s)}
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
  );
}
