"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
import { Check, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  appointmentSchema,
  APPOINTMENT_REASONS,
  type AppointmentInput,
} from "@/lib/validation/appointment";
import { LOCATIONS } from "@/config/site";
import { Turnstile } from "./turnstile";

/**
 * Formulario de cita en cinco pasos (§18).
 *
 * Multi-paso a propósito: una sola pantalla con doce campos abandona
 * mucho más en móvil, y la mayoría de estos pacientes llegan desde el
 * teléfono. Cada paso valida sólo sus campos antes de avanzar.
 */

const STEPS = ["location", "patient", "contact", "visit", "communication"] as const;

const FIELDS_BY_STEP: Record<number, (keyof AppointmentInput)[]> = {
  0: ["locationId"],
  1: ["patientStatus"],
  2: ["firstName", "lastName", "phone", "email"],
  3: ["reason", "preferredDate", "preferredTime", "notes"],
  4: ["communicationPreference", "smsTransactionalConsent"],
};

export function AppointmentForm() {
  const t = useTranslations("appointment");
  const te = useTranslations("appointment.errors");
  const locale = useLocale() as "en" | "es";
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Marca de tiempo de carga: se compara en el servidor para descartar
  // envíos instantáneos.
  const [startedAt] = useState(() => Date.now());

  // useCallback: sin esto, cada render crearía una función nueva y el
  // widget de Turnstile se volvería a montar en bucle.
  const handleToken = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
    mode: "onTouched",
    defaultValues: {
      locale,
      confirmSubscription: false,
      smsTransactionalConsent: false,
      smsMarketingConsent: false,
      patientStatus: "new",
      communicationPreference: "CALL",
    },
  });

  const commPref = watch("communicationPreference");
  const notes = watch("notes") ?? "";

  async function next() {
    const ok = await trigger(FIELDS_BY_STEP[step]);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  /**
   * Se ejecuta cuando la validación falla al enviar.
   *
   * Sin esto el botón parecía no responder: el error estaba en un campo
   * de un paso anterior, invisible desde el último. Ahora saltamos al
   * paso donde está el problema y lo decimos.
   */
  function onInvalid(formErrors: Record<string, unknown>) {
    const failed = Object.keys(formErrors);

    const firstStep = Object.entries(FIELDS_BY_STEP).find(([, fields]) =>
      fields.some((f) => failed.includes(f)),
    );

    if (firstStep) {
      setStep(Number(firstStep[0]));
      setServerError(null);
    } else {
      setServerError("validation");
    }
  }

  async function onSubmit(values: AppointmentInput) {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, locale, turnstileToken: captchaToken, startedAt }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setServerError(json.error ?? "server");
        setSubmitting(false);
        return;
      }
      router.push("/appointment/confirmation");
    } catch {
      setServerError("network");
      setSubmitting(false);
    }
  }

  /** Traduce el código de error de Zod a texto legible. */
  function err(field: keyof AppointmentInput) {
    const code = errors[field]?.message;
    if (!code) return null;
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-error" role="alert">
        <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
        {te(code as string)}
      </p>
    );
  }

  const inputBase =
    "w-full rounded-xl border border-border-subtle bg-surface px-4 py-3 text-base outline-none focus:border-brand-primary";
  const labelBase = "block text-sm font-semibold";

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
      {/* Progreso */}
      <ol className="mb-8 flex flex-wrap gap-2" aria-label={t("progress")}>
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? "step" : undefined}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              i < step
                ? "bg-brand-secondary-tint text-brand-secondary-deep"
                : i === step
                  ? "bg-brand-primary text-white"
                  : "bg-surface text-text-secondary"
            }`}
          >
            {i < step ? <Check className="size-3.5" aria-hidden="true" /> : <span>{i + 1}</span>}
            <span className="hidden sm:inline">{t(`steps.${s}`)}</span>
          </li>
        ))}
      </ol>

      {/* Trampa para bots.
          Es una CASILLA y no un campo de texto porque el autocompletado
          de Chrome rellenaba el input llamado "website" y bloqueaba a
          personas reales. Ningún gestor de contraseñas marca casillas.
          Va fuera de pantalla en vez de display:none: algunos bots
          ignoran lo oculto, pero no lo desplazado. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="confirmSubscription">Subscribe to our newsletter</label>
        <input
          id="confirmSubscription"
          type="checkbox"
          tabIndex={-1}
          {...register("confirmSubscription")}
        />
      </div>

      <div className="rounded-2xl border border-border-subtle bg-background p-6 sm:p-8">
        {/* ---------- 1. Ubicación ---------- */}
        {step === 0 && (
          <fieldset>
            <legend className="font-display text-xl font-bold">{t("location.legend")}</legend>
            <p className="mt-2 text-sm text-text-secondary">{t("location.help")}</p>
            <div className="mt-5 grid gap-3">
              {LOCATIONS.filter((l) => l.active).map((l) => (
                <label
                  key={l.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-subtle bg-surface p-4 has-checked:border-brand-primary has-checked:bg-brand-primary-tint"
                >
                  <input
                    type="radio"
                    value={l.slug}
                    className="mt-1 size-5 accent-[var(--color-brand-primary)]"
                    {...register("locationId")}
                  />
                  <span>
                    <span className="block font-display font-bold">
                      {locale === "es" ? l.nameES : l.nameEN}
                    </span>
                    <span className="block text-sm text-text-secondary">
                      {l.addressLine1}, {l.city}, {l.state} {l.postalCode}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {err("locationId")}
          </fieldset>
        )}

        {/* ---------- 2. Tipo de paciente ---------- */}
        {step === 1 && (
          <fieldset>
            <legend className="font-display text-xl font-bold">{t("patient.legend")}</legend>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(["new", "existing"] as const).map((v) => (
                <label
                  key={v}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-subtle bg-surface p-4 has-checked:border-brand-primary has-checked:bg-brand-primary-tint"
                >
                  <input
                    type="radio"
                    value={v}
                    className="size-5 accent-[var(--color-brand-primary)]"
                    {...register("patientStatus")}
                  />
                  <span className="font-semibold">{t(`patient.${v}`)}</span>
                </label>
              ))}
            </div>
            {/* Nunca revelamos si un teléfono corresponde a un expediente
                existente (§19). Mensaje neutro. */}
            <p className="mt-4 text-sm text-text-secondary">{t("patient.note")}</p>
          </fieldset>
        )}

        {/* ---------- 3. Contacto ---------- */}
        {step === 2 && (
          <fieldset>
            <legend className="font-display text-xl font-bold">{t("contact.legend")}</legend>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className={labelBase}>
                  {t("contact.firstName")}
                </label>
                <input id="firstName" autoComplete="given-name" className={`mt-1.5 ${inputBase}`} {...register("firstName")} />
                {err("firstName")}
              </div>
              <div>
                <label htmlFor="lastName" className={labelBase}>
                  {t("contact.lastName")}
                </label>
                <input id="lastName" autoComplete="family-name" className={`mt-1.5 ${inputBase}`} {...register("lastName")} />
                {err("lastName")}
              </div>
              <div>
                <label htmlFor="phone" className={labelBase}>
                  {t("contact.phone")}
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(215) 634-6567"
                  className={`mt-1.5 ${inputBase}`}
                  {...register("phone")}
                />
                {err("phone")}
              </div>
              <div>
                <label htmlFor="email" className={labelBase}>
                  {t("contact.email")}{" "}
                  <span className="font-normal text-text-secondary">{t("optional")}</span>
                </label>
                <input id="email" type="email" inputMode="email" autoComplete="email" className={`mt-1.5 ${inputBase}`} {...register("email")} />
                {err("email")}
              </div>
            </div>
          </fieldset>
        )}

        {/* ---------- 4. Visita ---------- */}
        {step === 3 && (
          <fieldset>
            <legend className="font-display text-xl font-bold">{t("visit.legend")}</legend>
            <div className="mt-5 grid gap-4">
              <div>
                <label htmlFor="reason" className={labelBase}>
                  {t("visit.reason")}
                </label>
                {/* Lista cerrada a propósito: no pedimos que el paciente
                    describa su problema médico en texto libre. */}
                <select id="reason" className={`mt-1.5 ${inputBase}`} defaultValue="" {...register("reason")}>
                  <option value="" disabled>
                    {t("visit.reasonPlaceholder")}
                  </option>
                  {APPOINTMENT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {t(`reasons.${r}`)}
                    </option>
                  ))}
                </select>
                {err("reason")}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="preferredDate" className={labelBase}>
                    {t("visit.date")} <span className="font-normal text-text-secondary">{t("optional")}</span>
                  </label>
                  <input id="preferredDate" type="date" className={`mt-1.5 ${inputBase}`} {...register("preferredDate")} />
                  {err("preferredDate")}
                </div>
                <div>
                  <span className={labelBase}>
                    {t("visit.time")} <span className="font-normal text-text-secondary">{t("optional")}</span>
                  </span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {(["morning", "afternoon"] as const).map((v) => (
                      <label
                        key={v}
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface px-3 py-3 text-sm font-semibold has-checked:border-brand-primary has-checked:bg-brand-primary-tint"
                      >
                        <input type="radio" value={v} className="size-4 accent-[var(--color-brand-primary)]" {...register("preferredTime")} />
                        {t(`visit.${v}`)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="notes" className={labelBase}>
                  {t("visit.notes")} <span className="font-normal text-text-secondary">{t("optional")}</span>
                </label>
                <textarea id="notes" rows={3} maxLength={500} className={`mt-1.5 ${inputBase}`} {...register("notes")} />
                <p className="mt-1.5 flex justify-between gap-3 text-sm text-text-secondary">
                  <span>{t("visit.notesWarning")}</span>
                  <span aria-hidden="true">{notes.length}/500</span>
                </p>
                {err("notes")}
              </div>
            </div>
          </fieldset>
        )}

        {/* ---------- 5. Comunicación y consentimiento ---------- */}
        {step === 4 && (
          <fieldset>
            <legend className="font-display text-xl font-bold">{t("comm.legend")}</legend>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {(["CALL", "TEXT", "EMAIL"] as const).map((v) => (
                <label
                  key={v}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface px-3 py-3 font-semibold has-checked:border-brand-primary has-checked:bg-brand-primary-tint"
                >
                  <input type="radio" value={v} className="size-4 accent-[var(--color-brand-primary)]" {...register("communicationPreference")} />
                  {t(`comm.${v}`)}
                </label>
              ))}
            </div>

            {/* Consentimiento transaccional. NUNCA premarcado. */}
            <label className="mt-6 flex cursor-pointer gap-3 rounded-xl border border-border-subtle bg-surface p-4">
              <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--color-brand-primary)]" {...register("smsTransactionalConsent")} />
              <span className="text-sm">{t("consent.transactional")}</span>
            </label>
            {err("smsTransactionalConsent")}
            {commPref === "TEXT" && !watch("smsTransactionalConsent") && (
              <p className="mt-1.5 text-sm text-text-secondary">{t("consent.requiredForText")}</p>
            )}

            {/* Marketing SEPARADO. Aceptar citas por texto no autoriza promociones. */}
            <label className="mt-3 flex cursor-pointer gap-3 rounded-xl border border-border-subtle bg-surface p-4">
              <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--color-brand-primary)]" {...register("smsMarketingConsent")} />
              <span className="text-sm">{t("consent.marketing")}</span>
            </label>

            <p className="mt-6 rounded-r-xl border-l-4 border-brand-primary bg-brand-primary-tint p-4 text-sm">
              <strong className="text-brand-primary">{t("consent.noticeStrong")}</strong>{" "}
              {t("consent.noticeRest")}
            </p>

            {/* Sólo en el último paso: cargarlo antes gastaría el token
                mientras la persona rellena el resto del formulario. */}
            <Turnstile onToken={handleToken} locale={locale} />
          </fieldset>
        )}

        {Object.keys(errors).length > 0 && (
          <p className="mt-6 flex items-center gap-2 rounded-xl bg-[#FDF0F0] p-4 text-sm text-error" role="alert">
            <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
            {te("validation")}
          </p>
        )}

        {serverError && (
          <p className="mt-6 flex items-center gap-2 rounded-xl bg-[#FDF0F0] p-4 text-sm text-error" role="alert">
            <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
            {te(serverError)}
          </p>
        )}

        {/* Navegación */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-5 font-bold text-brand-primary disabled:invisible"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            {t("back")}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand-primary px-6 font-bold text-white hover:bg-brand-primary-deep"
            >
              {t("next")}
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center rounded-full bg-brand-primary px-6 font-bold text-white hover:bg-brand-primary-deep disabled:opacity-60"
            >
              {submitting ? t("sending") : t("submit")}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
