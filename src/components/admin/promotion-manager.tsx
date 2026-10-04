"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Pencil,
  Play,
  Pause,
  Archive,
  X,
  Eye,
  MousePointerClick,
  CalendarCheck,
  MapPin,
  Globe,
  AlertTriangle,
} from "lucide-react";
import {
  savePromotion,
  setPromotionStatus,
} from "@/app/(admin)/admin/(protected)/offers/actions";
import type {
  PromotionRow,
  PromotionStatus,
  PromotionInput,
} from "@/app/(admin)/admin/(protected)/offers/types";

/**
 * src/components/admin/promotion-manager.tsx
 *
 * Editor de promociones. Decisiones que no son de estilo:
 *
 *   - Los dos idiomas son obligatorios. La mitad de los pacientes de
 *     Tus Ojos leen español; publicar sólo en inglés deja fuera a esa
 *     mitad sin que nadie se dé cuenta.
 *   - El campo "descuento" se escribe en lenguaje de mostrador, porque
 *     es lo que recepción lee en voz alta.
 *   - Publicar es un botón aparte de guardar. Nadie debería activar una
 *     promesa comercial sin querer.
 */

interface LocationOption {
  readonly slug: string;
  readonly name: string;
}

interface Props {
  readonly initialPromotions: PromotionRow[];
  readonly locations: LocationOption[];
  readonly canPublish: boolean;
}

const STATUS_LABEL: Record<PromotionStatus, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programada",
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  EXPIRED: "Vencida",
  ARCHIVED: "Archivada",
};

const STATUS_STYLE: Record<PromotionStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SCHEDULED: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PAUSED: "bg-orange-100 text-orange-800",
  EXPIRED: "bg-slate-100 text-slate-500",
  ARCHIVED: "bg-slate-100 text-slate-500",
};

const ERROR_TEXT: Record<string, string> = {
  forbidden: "No tienes permiso para esta acción.",
  nameRequired: "Ponle un nombre interno a la promoción.",
  bothLanguagesRequired: "El título es obligatorio en inglés y en español.",
  badDates: "La fecha de fin debe ser posterior a la de inicio.",
  slugTaken: "Ya existe una promoción activa con esa dirección (slug).",
  incomplete: "Faltan el título o la dirección (slug).",
  missingDiscount:
    "Escribe el texto del descuento en los dos idiomas antes de publicar: es lo que verá la sede.",
  server: "No se pudo guardar. Inténtalo de nuevo.",
};

const FREQUENCIES: ReadonlyArray<readonly [string, string]> = [
  ["once_24h", "Una vez al día"],
  ["once_session", "Una vez por visita"],
  ["once_7d", "Una vez por semana"],
  ["once_visitor", "Una sola vez por persona"],
  ["every_visit", "En cada página (agresivo)"],
];

const DISPLAY_TYPES: ReadonlyArray<readonly [string, string]> = [
  ["CORNER", "Esquina (recomendado)"],
  ["MODAL", "Centro de la pantalla"],
  ["BOTTOM_BAR", "Barra inferior"],
  ["TOP_BAR", "Barra superior"],
];

function emptyDraft(): PromotionInput {
  return {
    internalName: "",
    slug: "",
    titleEn: "",
    titleEs: "",
    descriptionEn: "",
    descriptionEs: "",
    discountLabelEn: "",
    discountLabelEs: "",
    termsEn:
      "Restrictions may apply. Cannot be combined with other offers. Ask the office for details.",
    termsEs:
      "Pueden aplicar restricciones. No combinable con otras ofertas. Consulta en la oficina.",
    ctaLabelEn: "Schedule now",
    ctaLabelEs: "Agendar ahora",
    exclusiveLocationSlug: "",
    displayType: "CORNER",
    showPopup: true,
    allowCampaign: false,
    delaySeconds: 7,
    frequency: "once_24h",
    startAt: "",
    endAt: "",
  };
}

function toDraft(p: PromotionRow): PromotionInput {
  return {
    id: p.id,
    internalName: p.internalName,
    slug: p.slug ?? "",
    titleEn: p.titleEn ?? "",
    titleEs: p.titleEs ?? "",
    descriptionEn: p.descriptionEn ?? "",
    descriptionEs: p.descriptionEs ?? "",
    discountLabelEn: p.discountLabelEn ?? "",
    discountLabelEs: p.discountLabelEs ?? "",
    termsEn: p.termsEn ?? "",
    termsEs: p.termsEs ?? "",
    ctaLabelEn: p.ctaLabelEn ?? "",
    ctaLabelEs: p.ctaLabelEs ?? "",
    exclusiveLocationSlug: p.exclusiveLocationSlug ?? "",
    displayType: p.displayType,
    showPopup: p.showPopup,
    allowCampaign: p.allowCampaign,
    delaySeconds: p.delaySeconds,
    frequency: p.frequency,
    startAt: p.startAt ? p.startAt.slice(0, 16) : "",
    endAt: p.endAt ? p.endAt.slice(0, 16) : "",
  };
}

const FIELD =
  "mt-1.5 w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-[0.95rem] outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";
const LABEL = "block text-[0.8rem] font-semibold text-text-secondary";

export function PromotionManager({ initialPromotions, locations, canPublish }: Props) {
  const [rows, setRows] = useState(initialPromotions);
  const [draft, setDraft] = useState<PromotionInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof PromotionInput>(key: K, value: PromotionInput[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  function save() {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const res = await savePromotion(draft);
      if (!res.ok) {
        setError(ERROR_TEXT[res.error] ?? ERROR_TEXT.server!);
        return;
      }
      setDraft(null);
      // Recargamos la lista desde el servidor: los contadores y el slug
      // normalizado los calcula la base, no el navegador.
      window.location.reload();
    });
  }

  function changeStatus(id: string, status: PromotionStatus) {
    setError(null);
    const previous = rows;
    // Optimista: el estado cambia en pantalla al instante y se revierte
    // si el servidor dice que no.
    setRows((r) => r.map((p) => (p.id === id ? { ...p, status } : p)));

    startTransition(async () => {
      const res = await setPromotionStatus(id, status);
      if (!res.ok) {
        setRows(previous);
        setError(ERROR_TEXT[res.error] ?? ERROR_TEXT.server!);
      }
    });
  }

  const locationName = (slug: string | null) =>
    slug ? (locations.find((l) => l.slug === slug)?.name ?? slug) : null;

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[0.9rem] text-red-800"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {!draft && (
        <button
          type="button"
          onClick={() => setDraft(emptyDraft())}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-5 font-bold text-white hover:bg-brand-primary-deep"
        >
          <Plus className="size-5" aria-hidden="true" />
          Nueva promoción
        </button>
      )}

      {/* ---------------- Editor ---------------- */}
      {draft && (
        <section className="rounded-2xl border border-border-subtle bg-surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-lg font-extrabold text-brand-primary">
              {draft.id ? "Editar promoción" : "Nueva promoción"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setError(null);
              }}
              aria-label="Cerrar editor"
              className="-m-2 rounded-lg p-2 text-text-secondary hover:bg-background"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={LABEL} htmlFor="p-name">
                Nombre interno <span className="font-normal">(no lo ve el público)</span>
              </label>
              <input
                id="p-name"
                className={FIELD}
                value={draft.internalName}
                onChange={(e) => set("internalName", e.target.value)}
                placeholder="Regreso a clases 2026"
              />
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL} htmlFor="p-slug">
                Dirección corta (slug)
              </label>
              <input
                id="p-slug"
                className={FIELD}
                value={draft.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="regreso-a-clases-2026"
              />
              <p className="mt-1 text-xs text-text-secondary">
                Aparece en el enlace de la cita. Si lo dejas vacío se genera del
                nombre interno.
              </p>
            </div>

            {/* --- Sede --- */}
            <div className="sm:col-span-2">
              <fieldset>
                <legend className={LABEL}>¿Dónde vale esta promoción?</legend>
                <div className="mt-2 space-y-2">
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border-subtle px-3 has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary-tint">
                    <input
                      type="radio"
                      name="scope"
                      className="size-4 accent-[var(--color-brand-primary)]"
                      checked={draft.exclusiveLocationSlug === ""}
                      onChange={() => set("exclusiveLocationSlug", "")}
                    />
                    <Globe className="size-4 text-brand-secondary" aria-hidden="true" />
                    <span className="text-[0.95rem] font-semibold">
                      Las tres oficinas
                    </span>
                  </label>

                  {locations.map((l) => (
                    <label
                      key={l.slug}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border-subtle px-3 has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary-tint"
                    >
                      <input
                        type="radio"
                        name="scope"
                        className="size-4 accent-[var(--color-brand-primary)]"
                        checked={draft.exclusiveLocationSlug === l.slug}
                        onChange={() => set("exclusiveLocationSlug", l.slug)}
                      />
                      <MapPin className="size-4 text-brand-secondary" aria-hidden="true" />
                      <span className="text-[0.95rem] font-semibold">
                        Sólo {l.name}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-text-secondary">
                  Si eliges una sola oficina, el formulario de cita la deja ya
                  seleccionada y el visitante no puede cambiarla.
                </p>
              </fieldset>
            </div>

            {/* --- Títulos --- */}
            <div>
              <label className={LABEL} htmlFor="p-title-es">
                Título — español
              </label>
              <input
                id="p-title-es"
                className={FIELD}
                value={draft.titleEs}
                onChange={(e) => set("titleEs", e.target.value)}
                placeholder="Exámenes para el regreso a clases"
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="p-title-en">
                Título — inglés
              </label>
              <input
                id="p-title-en"
                className={FIELD}
                value={draft.titleEn}
                onChange={(e) => set("titleEn", e.target.value)}
                placeholder="Back-to-school eye exams"
              />
            </div>

            {/* --- Descuento: el campo que lee recepción --- */}
            <div className="sm:col-span-2 rounded-xl border-l-[3px] border-brand-secondary bg-brand-secondary/5 p-4">
              <p className="text-[0.8rem] font-bold uppercase tracking-wider text-brand-secondary-deep">
                El descuento
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Este texto aparece en la ficha de la cita. Escríbelo como se lo
                dirías al paciente en el mostrador.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL} htmlFor="p-disc-es">
                    Descuento — español
                  </label>
                  <input
                    id="p-disc-es"
                    className={FIELD}
                    value={draft.discountLabelEs}
                    onChange={(e) => set("discountLabelEs", e.target.value)}
                    placeholder="20% de descuento en armazones infantiles"
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor="p-disc-en">
                    Descuento — inglés
                  </label>
                  <input
                    id="p-disc-en"
                    className={FIELD}
                    value={draft.discountLabelEn}
                    onChange={(e) => set("discountLabelEn", e.target.value)}
                    placeholder="20% off children's frames"
                  />
                </div>
              </div>
            </div>

            {/* --- Descripciones --- */}
            <div>
              <label className={LABEL} htmlFor="p-desc-es">
                Descripción — español
              </label>
              <textarea
                id="p-desc-es"
                rows={3}
                className={FIELD}
                value={draft.descriptionEs}
                onChange={(e) => set("descriptionEs", e.target.value)}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="p-desc-en">
                Descripción — inglés
              </label>
              <textarea
                id="p-desc-en"
                rows={3}
                className={FIELD}
                value={draft.descriptionEn}
                onChange={(e) => set("descriptionEn", e.target.value)}
              />
            </div>

            {/* --- Condiciones --- */}
            <div>
              <label className={LABEL} htmlFor="p-terms-es">
                Condiciones — español
              </label>
              <textarea
                id="p-terms-es"
                rows={2}
                className={FIELD}
                value={draft.termsEs}
                onChange={(e) => set("termsEs", e.target.value)}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="p-terms-en">
                Condiciones — inglés
              </label>
              <textarea
                id="p-terms-en"
                rows={2}
                className={FIELD}
                value={draft.termsEn}
                onChange={(e) => set("termsEn", e.target.value)}
              />
            </div>

            {/* --- Botón --- */}
            <div>
              <label className={LABEL} htmlFor="p-cta-es">
                Texto del botón — español
              </label>
              <input
                id="p-cta-es"
                className={FIELD}
                value={draft.ctaLabelEs}
                onChange={(e) => set("ctaLabelEs", e.target.value)}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="p-cta-en">
                Texto del botón — inglés
              </label>
              <input
                id="p-cta-en"
                className={FIELD}
                value={draft.ctaLabelEn}
                onChange={(e) => set("ctaLabelEn", e.target.value)}
              />
            </div>

            {/* --- Comportamiento --- */}
            {/* Dos destinos independientes. Sin esto, toda oferta
                publicada salía como ventana emergente, y no había forma
                de premiar a quien recibe la campaña con algo que el
                resto del mundo no ve. */}
            <fieldset className="sm:col-span-2">
              <legend className={LABEL}>Dónde se usa esta oferta</legend>

              <label className="mt-2 flex items-start gap-3 rounded-xl border border-border-subtle p-3">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-[#800080]"
                  checked={draft.showPopup}
                  onChange={(e) => set("showPopup", e.target.checked)}
                />
                <span className="text-sm">
                  <strong>Ventana emergente en el sitio</strong>
                  <span className="mt-0.5 block text-text-secondary">
                    La ve cualquiera que entre en la web.
                  </span>
                </span>
              </label>

              <label className="mt-2 flex items-start gap-3 rounded-xl border border-border-subtle p-3">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-[#800080]"
                  checked={draft.allowCampaign}
                  onChange={(e) => set("allowCampaign", e.target.checked)}
                />
                <span className="text-sm">
                  <strong>Campañas por correo</strong>
                  <span className="mt-0.5 block text-text-secondary">
                    Se puede elegir al escribir una campaña. Si marcas sólo
                    ésta, el descuento es exclusivo de quien reciba el correo:
                    no aparece en la web, pero su enlace sí deja la cita con el
                    descuento anotado.
                  </span>
                </span>
              </label>

              {!draft.showPopup && !draft.allowCampaign && (
                <p className="mt-2 text-xs font-semibold text-amber-900">
                  Sin ninguna de las dos marcada, esta oferta no se mostrará en
                  ningún sitio.
                </p>
              )}
            </fieldset>

            <div>
              <label className={LABEL} htmlFor="p-display">
                Dónde aparece
              </label>
              <select
                id="p-display"
                className={FIELD}
                value={draft.displayType}
                onChange={(e) => set("displayType", e.target.value)}
              >
                {DISPLAY_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="p-freq">
                Cada cuánto se muestra
              </label>
              <select
                id="p-freq"
                className={FIELD}
                value={draft.frequency}
                onChange={(e) => set("frequency", e.target.value)}
              >
                {FREQUENCIES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL} htmlFor="p-delay">
                Segundos antes de aparecer
              </label>
              <input
                id="p-delay"
                type="number"
                min={3}
                max={60}
                className={FIELD}
                value={draft.delaySeconds}
                onChange={(e) => set("delaySeconds", Number(e.target.value))}
              />
            </div>
            <div />

            <div>
              <label className={LABEL} htmlFor="p-start">
                Empieza (opcional)
              </label>
              <input
                id="p-start"
                type="datetime-local"
                className={FIELD}
                value={draft.startAt}
                onChange={(e) => set("startAt", e.target.value)}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="p-end">
                Termina (opcional)
              </label>
              <input
                id="p-end"
                type="datetime-local"
                className={FIELD}
                value={draft.endAt}
                onChange={(e) => set("endAt", e.target.value)}
              />
            </div>
          </div>

          {/* --- Vista previa --- */}
          <div className="mt-6 rounded-xl border border-border-subtle bg-background p-4">
            <p className="text-[0.8rem] font-bold uppercase tracking-wider text-text-secondary">
              Así lo verá el visitante (español)
            </p>
            <div className="mx-auto mt-3 w-[min(340px,100%)] rounded-2xl border border-border-subtle bg-surface p-5 shadow-lg">
              <span className="inline-block rounded-full bg-brand-primary-tint px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-brand-primary">
                Promoción
              </span>
              <h3 className="mt-3 font-display text-lg font-extrabold leading-tight text-brand-primary">
                {draft.titleEs || "Título de la promoción"}
              </h3>
              {draft.discountLabelEs && (
                <p className="mt-2 border-l-[3px] border-brand-secondary pl-3 font-display font-bold">
                  {draft.discountLabelEs}
                </p>
              )}
              {draft.descriptionEs && (
                <p className="mt-3 text-sm text-text-secondary">{draft.descriptionEs}</p>
              )}
              <div className="mt-4 flex min-h-11 items-center justify-center rounded-full bg-brand-primary px-6 font-bold text-white">
                {draft.ctaLabelEs || "Agendar ahora"}
              </div>
              {draft.termsEs && (
                <p className="mt-3 text-xs leading-relaxed text-text-secondary">
                  {draft.termsEs}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-6 font-bold text-white hover:bg-brand-primary-deep disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar borrador"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setError(null);
              }}
              className="inline-flex min-h-11 items-center rounded-full border border-border-subtle px-6 font-semibold hover:bg-background"
            >
              Cancelar
            </button>
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            Guardar no publica nada. La promoción queda en borrador hasta que la
            actives desde la lista.
          </p>
        </section>
      )}

      {/* ---------------- Lista ---------------- */}
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-subtle p-8 text-center text-text-secondary">
          Todavía no hay promociones.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((p) => {
            const scope = locationName(p.exclusiveLocationSlug);
            return (
              <li
                key={p.id}
                className="rounded-2xl border border-border-subtle bg-surface p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wider ${STATUS_STYLE[p.status]}`}
                      >
                        {STATUS_LABEL[p.status]}
                      </span>
                      {p.isDemo && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wider text-amber-800">
                          Ejemplo — no publicar
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[0.8rem] font-semibold text-text-secondary">
                        {scope ? (
                          <>
                            <MapPin className="size-3.5" aria-hidden="true" />
                            Sólo {scope}
                          </>
                        ) : (
                          <>
                            <Globe className="size-3.5" aria-hidden="true" />
                            Las tres oficinas
                          </>
                        )}
                      </span>
                    </div>

                    <h3 className="mt-2 font-display text-lg font-bold">
                      {p.internalName}
                    </h3>
                    {p.discountLabelEs && (
                      <p className="mt-1 text-[0.95rem] text-text-secondary">
                        {p.discountLabelEs}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-4 text-[0.85rem] text-text-secondary">
                      <span className="inline-flex items-center gap-1.5">
                        <Eye className="size-4" aria-hidden="true" />
                        {p.impressions} vistas
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MousePointerClick className="size-4" aria-hidden="true" />
                        {p.ctaClicks} clics
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-brand-secondary-deep">
                        <CalendarCheck className="size-4" aria-hidden="true" />
                        {p.appointments} citas
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(toDraft(p));
                        setError(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border-subtle px-4 text-[0.9rem] font-semibold hover:bg-background"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      Editar
                    </button>

                    {canPublish && p.status !== "ACTIVE" && p.status !== "ARCHIVED" && (
                      <button
                        type="button"
                        onClick={() => changeStatus(p.id, "ACTIVE")}
                        disabled={pending}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-brand-secondary-deep px-4 text-[0.9rem] font-bold text-white hover:opacity-90 disabled:opacity-60"
                      >
                        <Play className="size-4" aria-hidden="true" />
                        Publicar
                      </button>
                    )}

                    {canPublish && p.status === "ACTIVE" && (
                      <button
                        type="button"
                        onClick={() => changeStatus(p.id, "PAUSED")}
                        disabled={pending}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border-subtle px-4 text-[0.9rem] font-semibold hover:bg-background disabled:opacity-60"
                      >
                        <Pause className="size-4" aria-hidden="true" />
                        Pausar
                      </button>
                    )}

                    {canPublish && p.status !== "ARCHIVED" && (
                      <button
                        type="button"
                        onClick={() => changeStatus(p.id, "ARCHIVED")}
                        disabled={pending}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-[0.9rem] font-semibold text-text-secondary hover:bg-background disabled:opacity-60"
                      >
                        <Archive className="size-4" aria-hidden="true" />
                        Archivar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}