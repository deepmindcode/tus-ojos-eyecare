"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Mail, Plus, Send, Users } from "lucide-react";
import {
  saveCampaign,
  previewAudience,
  sendNextBatch,
  type CampaignInput,
} from "@/app/(admin)/admin/(protected)/campaigns/actions";

/**
 * src/components/admin/campaign-manager.tsx
 *
 * Redactar un envío y mandarlo por tandas.
 *
 * Lo que la pantalla impone y no se puede saltar:
 *
 *   - No se envía nada hasta haber visto el recuento. El botón de enviar
 *     sólo aparece después de pedir el público, y dice a cuántas personas
 *     va. Mandar a ciegas a trescientas personas no debería ser posible
 *     con un clic de más.
 *   - Cada tanda es un clic. No hay "enviar a todos".
 *   - El aviso sobre no poner el motivo de consulta en el asunto está
 *     junto al campo del asunto, no en el manual: ahí es donde se lee.
 */

export interface CampaignRow {
  readonly id: string;
  readonly name: string;
  readonly subjectEs: string;
  readonly subjectEn: string;
  readonly bodyEs: string;
  readonly bodyEn: string;
  readonly locationId: string | null;
  readonly reason: string | null;
  readonly promotionId: string | null;
  readonly status: string;
  readonly sent: number;
  readonly failed: number;
  readonly createdAt: string;
}

export interface Option {
  readonly value: string;
  readonly label: string;
}

const EMPTY: CampaignInput = {
  name: "",
  subjectEs: "",
  subjectEn: "",
  bodyEs: "",
  bodyEn: "",
  locationId: "",
  reason: "",
  promotionId: "",
};

export function CampaignManager({
  initial,
  locations,
  reasons,
  promotions,
}: {
  readonly initial: readonly CampaignRow[];
  readonly locations: readonly Option[];
  readonly reasons: readonly Option[];
  readonly promotions: readonly Option[];
}) {
  const [editing, setEditing] = useState<CampaignInput | null>(null);
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const [audience, setAudience] = useState<
    Record<string, { pending: number; total: number; withoutEmail: number; unsubscribed: number; alreadySent: number }>
  >({});

  function openNew() {
    setNotice(null);
    setEditing({ ...EMPTY });
  }

  function openEdit(c: CampaignRow) {
    setNotice(null);
    setEditing({
      id: c.id,
      name: c.name,
      subjectEs: c.subjectEs,
      subjectEn: c.subjectEn,
      bodyEs: c.bodyEs,
      bodyEn: c.bodyEn,
      locationId: c.locationId ?? "",
      reason: c.reason ?? "",
      promotionId: c.promotionId ?? "",
    });
  }

  function save() {
    if (!editing) return;
    start(async () => {
      const res = await saveCampaign(editing);
      setNotice(res.ok ? "Guardado." : "No se pudo guardar: revisa nombre, asunto y mensaje.");
      if (res.ok) setEditing(null);
    });
  }

  function check(id: string) {
    start(async () => {
      const a = await previewAudience(id);
      setAudience((prev) => ({ ...prev, [id]: a }));
    });
  }

  function send(id: string, size: number) {
    start(async () => {
      const r = await sendNextBatch(id, size);
      setNotice(
        r.sent === 0 && r.remaining === 0
          ? "No queda nadie por recibir esta campaña."
          : `Enviados ${r.sent}${r.failed ? `, fallaron ${r.failed}` : ""}. Quedan ${r.remaining}.`,
      );
      const a = await previewAudience(id);
      setAudience((prev) => ({ ...prev, [id]: a }));
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={openNew}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-primary-deep"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nueva campaña
        </button>
        {notice && <p className="text-sm font-semibold text-brand-secondary-deep">{notice}</p>}
      </div>

      {editing && (
        <div className="mt-6 rounded-2xl border-2 border-brand-primary bg-surface p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold text-brand-primary">
            {editing.id ? "Editar campaña" : "Nueva campaña"}
          </h2>

          <Field label="Nombre interno (no se publica)">
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className={input}
            />
          </Field>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Sede">
              <select
                value={editing.locationId}
                onChange={(e) => setEditing({ ...editing, locationId: e.target.value })}
                className={input}
              >
                <option value="">Todas</option>
                {locations.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Motivo">
              <select
                value={editing.reason}
                onChange={(e) => setEditing({ ...editing, reason: e.target.value })}
                className={input}
              >
                <option value="">Cualquiera</option>
                {reasons.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Promoción (opcional)">
              <select
                value={editing.promotionId}
                onChange={(e) => setEditing({ ...editing, promotionId: e.target.value })}
                className={input}
              >
                <option value="">Sin descuento</option>
                {promotions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-text-secondary">
            Al elegir una promoción, el correo lleva su descuento y el botón deja
            la cita con ese descuento ya anotado. Así sabrás cuántas citas salieron
            de este envío.
            {promotions.length === 0 && (
              <>
                {" "}
                <strong className="text-text-primary">
                  No hay ninguna promoción activa.
                </strong>{" "}
                El descuento no se escribe aquí: créalo primero en Offers y
                publícalo. Sólo salen las activas, porque una en borrador se vería
                en el correo pero el formulario de cita no la reconocería, y el
                cliente llegaría al mostrador con un descuento que no consta.
              </>
            )}
          </p>

          <Field label="Asunto (español)">
            <input
              value={editing.subjectEs}
              onChange={(e) => setEditing({ ...editing, subjectEs: e.target.value })}
              className={input}
            />
          </Field>

          <p className="mt-2 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              No pongas el motivo de consulta en el asunto. «Oferta en lentes» sí;
              «Seguimiento de su ojo seco» no — el asunto se lee desde la pantalla
              bloqueada del teléfono, y eso es información de salud.
            </span>
          </p>

          <Field label="Mensaje (español)">
            <textarea
              rows={7}
              value={editing.bodyEs}
              onChange={(e) => setEditing({ ...editing, bodyEs: e.target.value })}
              className={`${input} resize-y`}
            />
          </Field>

          <Field label="Asunto en inglés (opcional)">
            <input
              value={editing.subjectEn}
              onChange={(e) => setEditing({ ...editing, subjectEn: e.target.value })}
              className={input}
            />
          </Field>

          <Field label="Mensaje en inglés (opcional, va debajo del español)">
            <textarea
              rows={5}
              value={editing.bodyEn}
              onChange={(e) => setEditing({ ...editing, bodyEn: e.target.value })}
              className={`${input} resize-y`}
            />
          </Field>

          <p className="mt-3 text-xs text-text-secondary">
            El enlace para darse de baja y la dirección postal se añaden solos a
            cada correo. Son obligatorios por ley y no se pueden quitar.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="min-h-11 rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-primary-deep disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="min-h-11 rounded-full border-2 border-border-subtle px-5 text-sm font-bold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {initial.length === 0 && !editing && (
          <p className="rounded-2xl border border-border-subtle bg-surface p-8 text-center text-text-secondary">
            Todavía no hay campañas.
          </p>
        )}

        {initial.map((c) => {
          const a = audience[c.id];
          return (
            <div key={c.id} className="rounded-2xl border border-border-subtle bg-surface p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-base font-extrabold">{c.name}</h3>
                <span className="rounded-full border border-border-subtle px-2.5 py-1 text-xs font-bold capitalize text-text-secondary">
                  {c.status.toLowerCase()}
                </span>
                <span className="ml-auto text-sm text-text-secondary">
                  <Mail className="mr-1 inline size-4" aria-hidden="true" />
                  {c.sent} enviados
                  {c.failed > 0 && ` · ${c.failed} fallaron`}
                </span>
              </div>

              <p className="mt-1 text-sm text-text-secondary">{c.subjectEs}</p>

              {a && (
                <div className="mt-4 rounded-xl bg-brand-secondary-tint p-4 text-sm text-brand-secondary-deep">
                  <p className="flex items-center gap-2 font-bold">
                    <Users className="size-4" aria-hidden="true" />
                    Quedan {a.pending} personas por recibir esta campaña
                  </p>
                  <p className="mt-1.5 text-[0.85rem]">
                    {a.total} en el público · {a.alreadySent} ya la recibieron ·{" "}
                    {a.unsubscribed} dados de baja · {a.withoutEmail} sin correo
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => check(c.id)}
                  disabled={pending}
                  className="min-h-11 rounded-full border-2 border-border-subtle px-4 text-sm font-bold hover:border-brand-secondary disabled:opacity-60"
                >
                  Ver a cuántos va
                </button>

                {a && a.pending > 0 && (
                  <>
                    {[25, 50].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => send(c.id, n)}
                        disabled={pending}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-primary-deep disabled:opacity-60"
                      >
                        <Send className="size-4" aria-hidden="true" />
                        Enviar {Math.min(n, a.pending)}
                      </button>
                    ))}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="min-h-11 rounded-full border-2 border-border-subtle px-4 text-sm font-bold"
                >
                  Editar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const input =
  "mt-1 min-h-11 w-full rounded-xl border-2 border-border-subtle bg-surface px-3 py-2 text-sm focus:border-brand-primary focus:outline-none";

function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <label className="mt-4 block">
      <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}
