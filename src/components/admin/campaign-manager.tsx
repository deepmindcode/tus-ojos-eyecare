"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Mail, Plus, Search, Send, Users } from "lucide-react";
import {
  saveCampaign,
  previewAudience,
  sendNextBatch,
  sendSelected,
  sendTestToSelf,
  type CampaignInput,
} from "@/app/(admin)/admin/(protected)/campaigns/actions";

/**
 * src/components/admin/campaign-manager.tsx
 *
 * Redactar un envío y mandarlo: a mano a quien elijas, o por tandas.
 *
 * Lo que la pantalla impone y no se puede saltar:
 *
 *   - No se envía nada hasta haber visto a quién. El botón de enviar sólo
 *     aparece después de pedir el público, y se ve la lista de nombres y
 *     correos antes de pulsar. Mandar a ciegas a trescientas personas no
 *     debería ser posible con un clic de más.
 *   - Las direcciones no se escriben a mano en ningún sitio: se marcan de
 *     la lista del público. La pantalla no sirve para escribir a nadie de
 *     fuera desde el dominio del negocio.
 *   - Cada tanda es un clic. No hay "enviar a todos".
 *   - El aviso sobre no poner el motivo de consulta en el asunto está
 *     junto al campo del asunto, no en el manual: ahí es donde se lee.
 */

interface AudienceState {
  readonly pending: number;
  readonly total: number;
  readonly withoutEmail: number;
  readonly unsubscribed: number;
  readonly alreadySent: number;
  readonly recipients: readonly { readonly email: string; readonly name: string }[];
}

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

  const [audience, setAudience] = useState<Record<string, AudienceState>>({});

  /** Marcados a mano, por campaña. */
  const [picked, setPicked] = useState<Record<string, readonly string[]>>({});
  const [query, setQuery] = useState<Record<string, string>>({});

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
      if (res.ok) {
        setNotice("Guardado.");
        setEditing(null);
        return;
      }
      setNotice(
        res.error === "missingFields"
          ? "Falta algo: el nombre, el asunto en español y el mensaje en español son obligatorios."
          : `No se pudo guardar. ${res.detail ?? ""}`.trim(),
      );
    });
  }

  function check(id: string) {
    start(async () => {
      const a = await previewAudience(id);
      setAudience((prev) => ({ ...prev, [id]: a }));
    });
  }

  /**
   * Tras cualquier envío se vuelve a pedir el público y se vacía lo
   * marcado: quien acaba de recibirlo ya no está en la lista, y dejar sus
   * casillas marcadas invitaría a darle al botón otra vez.
   */
  async function reload(id: string) {
    const a = await previewAudience(id);
    setAudience((prev) => ({ ...prev, [id]: a }));
    setPicked((prev) => ({ ...prev, [id]: [] }));
  }

  function send(id: string, size: number) {
    start(async () => {
      const r = await sendNextBatch(id, size);
      setNotice(
        r.sent === 0 && r.remaining === 0
          ? "No queda nadie por recibir esta campaña."
          : `Enviados ${r.sent}${r.failed ? `, fallaron ${r.failed}` : ""}. Quedan ${r.remaining}.`,
      );
      await reload(id);
    });
  }

  function sendPicked(id: string) {
    const emails = picked[id] ?? [];
    if (emails.length === 0) return;
    start(async () => {
      const r = await sendSelected(id, emails);
      setNotice(
        r.ok
          ? `Enviado a ${r.sent}${r.failed ? `, fallaron ${r.failed}` : ""}.`
          : "No se envió nada: ninguna de las personas marcadas sigue en el público.",
      );
      await reload(id);
      // Lo que no cupo en la tanda sigue marcado: el aviso de la pantalla
      // dice que quedan para la siguiente, y tiene que ser verdad.
      const left = emails.slice(MAX_PICK);
      if (left.length > 0) setPicked((prev) => ({ ...prev, [id]: left }));
    });
  }

  function test(id: string) {
    start(async () => {
      const r = await sendTestToSelf(id);
      setNotice(
        r.ok
          ? `Prueba enviada a ${r.to}. Llega con «[PRUEBA]» en el asunto y no cuenta como enviada a nadie.`
          : r.error === "noEmail"
            ? "Tu usuario no tiene correo registrado, así que no hay dónde mandar la prueba."
            : `No se pudo enviar la prueba. ${r.error}`,
      );
    });
  }

  function toggle(id: string, email: string) {
    setPicked((prev) => {
      const cur = prev[id] ?? [];
      return {
        ...prev,
        [id]: cur.includes(email) ? cur.filter((e) => e !== email) : [...cur, email],
      };
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
                  No hay ninguna oferta disponible para campañas.
                </strong>{" "}
                El descuento no se escribe aquí: se crea en Offers. Para que
                aparezca en esta lista tiene que estar <strong>activa</strong> y
                tener marcada la casilla <strong>«Campañas por correo»</strong>.
                Si marcas sólo ésa y no la del sitio, el descuento será exclusivo
                de quien reciba el correo.
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
                <>
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

                  {a.pending > 0 && (
                    <Picker
                      recipients={a.recipients}
                      picked={picked[c.id] ?? []}
                      query={query[c.id] ?? ""}
                      onQuery={(v) => setQuery((prev) => ({ ...prev, [c.id]: v }))}
                      onToggle={(email) => toggle(c.id, email)}
                      onSet={(emails) => setPicked((prev) => ({ ...prev, [c.id]: emails }))}
                    />
                  )}
                </>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => check(c.id)}
                  disabled={pending}
                  className="min-h-11 rounded-full border-2 border-border-subtle px-4 text-sm font-bold hover:border-brand-secondary disabled:opacity-60"
                >
                  {a ? "Actualizar la lista" : "Ver a quién va"}
                </button>

                {a && a.pending > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => sendPicked(c.id)}
                      disabled={pending || (picked[c.id] ?? []).length === 0}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-primary-deep disabled:opacity-40"
                    >
                      <Send className="size-4" aria-hidden="true" />
                      Enviar a los marcados ({(picked[c.id] ?? []).length})
                    </button>

                    {[25, 50].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => send(c.id, n)}
                        disabled={pending}
                        className="min-h-11 rounded-full border-2 border-brand-primary px-4 text-sm font-bold text-brand-primary hover:bg-brand-primary-tint disabled:opacity-60"
                      >
                        Enviar los {Math.min(n, a.pending)} primeros
                      </button>
                    ))}
                  </>
                )}

                {a && (
                  <button
                    type="button"
                    onClick={() => test(c.id)}
                    disabled={pending}
                    className="min-h-11 rounded-full border-2 border-border-subtle px-4 text-sm font-bold hover:border-brand-secondary disabled:opacity-60"
                  >
                    Enviar prueba a mi correo
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="min-h-11 rounded-full border-2 border-border-subtle px-4 text-sm font-bold"
                >
                  Editar
                </button>
              </div>

              {(picked[c.id] ?? []).length > MAX_PICK && (
                <p className="mt-2 text-xs font-semibold text-amber-900">
                  Has marcado {(picked[c.id] ?? []).length}. De una vez salen{" "}
                  {MAX_PICK}; el resto se quedan marcados para la siguiente.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * La lista de quien va a recibir el correo, con casillas.
 *
 * Se marca de aquí o no se envía: no hay ningún campo donde teclear una
 * dirección. Y el buscador es por nombre o correo, nunca por motivo de
 * consulta — filtrar por motivo se hace al crear la campaña, no mirando
 * una lista con el diagnóstico de cada persona al lado del nombre.
 */
function Picker({
  recipients,
  picked,
  query,
  onQuery,
  onToggle,
  onSet,
}: {
  readonly recipients: readonly { readonly email: string; readonly name: string }[];
  readonly picked: readonly string[];
  readonly query: string;
  readonly onQuery: (v: string) => void;
  readonly onToggle: (email: string) => void;
  readonly onSet: (emails: readonly string[]) => void;
}) {
  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      q
        ? recipients.filter(
            (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
          )
        : recipients,
    [recipients, q],
  );

  const chosen = new Set(picked);

  return (
    <div className="mt-4 rounded-xl border border-border-subtle">
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle p-3">
        <label className="relative flex-1 min-w-48">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar por nombre o correo"
            className="min-h-11 w-full rounded-xl border-2 border-border-subtle bg-surface pl-9 pr-3 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={() => onSet(shown.map((r) => r.email))}
          className="min-h-11 rounded-full border-2 border-border-subtle px-3 text-xs font-bold hover:border-brand-secondary"
        >
          Marcar {q ? "los encontrados" : "todos"} ({shown.length})
        </button>
        <button
          type="button"
          onClick={() => onSet([])}
          className="min-h-11 rounded-full border-2 border-border-subtle px-3 text-xs font-bold hover:border-brand-secondary"
        >
          Desmarcar
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {shown.length === 0 ? (
          <p className="p-4 text-sm text-text-secondary">Nadie coincide con esa búsqueda.</p>
        ) : (
          <ul>
            {shown.map((r) => (
              <li key={r.email} className="border-b border-border-subtle last:border-0">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-background">
                  <input
                    type="checkbox"
                    checked={chosen.has(r.email)}
                    onChange={() => onToggle(r.email)}
                    className="size-4 accent-brand-primary"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{r.name}</span>
                    <span className="block truncate text-xs text-text-secondary">{r.email}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="border-t border-border-subtle p-3 text-xs leading-relaxed text-text-secondary">
        Marca una persona, dos o diez y pulsa «Enviar a los marcados». De una vez
        salen como máximo {MAX_PICK}. Quien ya recibió esta campaña no aparece en
        la lista.
      </p>
    </div>
  );
}

/** Lo que acepta el servidor de una vez. Igual que MAX_BATCH en el envío. */
const MAX_PICK = 50;

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
