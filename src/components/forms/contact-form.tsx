"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import {
  contactSchema,
  CONTACT_SUBJECTS,
  type ContactInput,
} from "@/lib/validation/contact";
import { LOCATIONS } from "@/config/site";
import { Turnstile } from "./turnstile";

/**
 * src/components/forms/contact-form.tsx
 *
 * Formulario de contacto, de una sola pantalla.
 *
 * A diferencia del de cita, aqui no hay pasos: son cinco campos y
 * partirlos en pasos solo anadiria clics. La trampa antibot es la misma
 * casilla fuera de pantalla, por la misma razon: un input llamado
 * "website" lo autocompleta Chrome y bloquea a personas reales.
 */

const ES = {
  heading: "Escríbenos",
  intro:
    "¿Tienes una pregunta que no requiere cita? Escríbenos y te contestamos. Para una urgencia, llama por teléfono.",
  name: "Nombre",
  email: "Correo electrónico",
  phone: "Teléfono",
  optional: "(opcional)",
  office: "¿Sobre qué oficina?",
  officeAny: "No es sobre una oficina en concreto",
  subject: "¿De qué se trata?",
  message: "Tu mensaje",
  messageWarning:
    "No incluyas información médica ni datos de tu seguro. El correo no es un canal seguro.",
  submit: "Enviar mensaje",
  sending: "Enviando…",
  okTitle: "Mensaje enviado",
  okBody: "Lo revisamos y te contestamos al correo que nos diste.",
  subjects: {
    GENERAL: "Una pregunta general",
    INSURANCE: "Seguros y formas de pago",
    APPOINTMENT_QUESTION: "Algo sobre una cita",
    GLASSES_REPAIR: "Reparación o ajuste de lentes",
    PRESCRIPTION_COPY: "Una copia de mi receta",
    OTHER: "Otra cosa",
  },
  errors: {
    required: "Este campo es obligatorio",
    tooLong: "Es demasiado largo",
    tooShort: "Escribe un poco más, para poder ayudarte",
    invalidName: "Revisa el nombre",
    invalidEmail: "Revisa el correo",
    invalidPhone: "Revisa el teléfono",
    validation: "Revisa los campos marcados",
    captcha: "No pudimos verificar que eres una persona. Vuelve a intentarlo.",
    rateLimited: "Has enviado varios mensajes seguidos. Inténtalo más tarde.",
    server: "No se pudo enviar. Llámanos por teléfono y te atendemos.",
    network: "Problema de conexión. Inténtalo de nuevo.",
  },
} as const;

const EN = {
  heading: "Send us a message",
  intro:
    "Have a question that does not need an appointment? Write to us and we will get back to you. For anything urgent, call us.",
  name: "Name",
  email: "Email",
  phone: "Phone",
  optional: "(optional)",
  office: "Which office is this about?",
  officeAny: "Not about a specific office",
  subject: "What is it about?",
  message: "Your message",
  messageWarning:
    "Please do not include medical information or insurance details. Email is not a secure channel.",
  submit: "Send message",
  sending: "Sending…",
  okTitle: "Message sent",
  okBody: "We will read it and reply to the email address you gave us.",
  subjects: {
    GENERAL: "A general question",
    INSURANCE: "Insurance and payment",
    APPOINTMENT_QUESTION: "Something about an appointment",
    GLASSES_REPAIR: "Eyewear repair or adjustment",
    PRESCRIPTION_COPY: "A copy of my prescription",
    OTHER: "Something else",
  },
  errors: {
    required: "This field is required",
    tooLong: "That is too long",
    tooShort: "Please write a little more so we can help",
    invalidName: "Please check the name",
    invalidEmail: "Please check the email",
    invalidPhone: "Please check the phone number",
    validation: "Please check the highlighted fields",
    captcha: "We could not verify you are a person. Please try again.",
    rateLimited: "You have sent several messages in a row. Please try later.",
    server: "We could not send it. Please call us and we will help you.",
    network: "Connection problem. Please try again.",
  },
} as const;

export function ContactForm({ locale }: { readonly locale: string }) {
  const t = locale === "es" ? ES : EN;

  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());

  // Sin useCallback el widget de Turnstile se remonta en bucle.
  const handleToken = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    mode: "onTouched",
    defaultValues: {
      locale: locale === "es" ? "es" : "en",
      confirmSubscription: false,
      subject: "GENERAL",
    },
  });

  const message = watch("message") ?? "";

  async function onSubmit(values: ContactInput) {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, turnstileToken: captchaToken, startedAt }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setServerError(json.error ?? "server");
        setSubmitting(false);
        return;
      }
      setSent(true);
    } catch {
      setServerError("network");
      setSubmitting(false);
    }
  }

  function err(field: keyof ContactInput) {
    const code = errors[field]?.message as keyof typeof t.errors | undefined;
    if (!code) return null;
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-error" role="alert">
        <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
        {t.errors[code] ?? t.errors.validation}
      </p>
    );
  }

  const input =
    "mt-1.5 w-full rounded-xl border border-border-subtle bg-surface px-4 py-3 text-base outline-none focus:border-brand-primary";
  const label = "block text-sm font-semibold";

  if (sent) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-brand-secondary/40 bg-brand-secondary-tint p-8 text-center"
      >
        <CheckCircle2
          className="mx-auto size-10 text-brand-secondary-deep"
          aria-hidden="true"
        />
        <h2 className="mt-3 font-display text-xl font-extrabold text-brand-primary">
          {t.okTitle}
        </h2>
        <p className="mt-2 text-[0.95rem] text-text-secondary">{t.okBody}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-brand-primary">
        {t.heading}
      </h2>
      <p className="mt-2 text-[0.95rem] text-text-secondary">{t.intro}</p>

      {/* Trampa para bots: fuera de pantalla, no display:none. Algunos
          bots ignoran lo oculto, pero no lo desplazado. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="contact-confirm">Subscribe to our newsletter</label>
        <input
          id="contact-confirm"
          type="checkbox"
          tabIndex={-1}
          {...register("confirmSubscription")}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={label}>
            {t.name}
          </label>
          <input
            id="contact-name"
            autoComplete="name"
            className={input}
            {...register("name")}
          />
          {err("name")}
        </div>

        <div>
          <label htmlFor="contact-email" className={label}>
            {t.email}
          </label>
          <input
            id="contact-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className={input}
            {...register("email")}
          />
          {err("email")}
        </div>

        <div>
          <label htmlFor="contact-phone" className={label}>
            {t.phone}{" "}
            <span className="font-normal text-text-secondary">{t.optional}</span>
          </label>
          <input
            id="contact-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={input}
            {...register("phone")}
          />
          {err("phone")}
        </div>

        <div>
          <label htmlFor="contact-office" className={label}>
            {t.office}
          </label>
          <select id="contact-office" className={input} {...register("locationSlug")}>
            <option value="">{t.officeAny}</option>
            {LOCATIONS.filter((l) => l.active).map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.city}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="contact-subject" className={label}>
            {t.subject}
          </label>
          <select id="contact-subject" className={input} {...register("subject")}>
            {CONTACT_SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {t.subjects[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="contact-message" className={label}>
            {t.message}
          </label>
          <textarea
            id="contact-message"
            rows={5}
            maxLength={2000}
            className={input}
            {...register("message")}
          />
          <p className="mt-1.5 flex flex-wrap justify-between gap-3 text-sm text-text-secondary">
            <span>{t.messageWarning}</span>
            <span aria-hidden="true">{message.length}/2000</span>
          </p>
          {err("message")}
        </div>
      </div>

      <Turnstile onToken={handleToken} locale={locale === "es" ? "es" : "en"} />

      {serverError && (
        <p
          className="mt-5 flex items-center gap-2 rounded-xl bg-[#FDF0F0] p-4 text-sm text-error"
          role="alert"
        >
          <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
          {t.errors[serverError as keyof typeof t.errors] ?? t.errors.server}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-7 font-bold text-white hover:bg-brand-primary-deep disabled:opacity-60"
      >
        <Send className="size-4" aria-hidden="true" />
        {submitting ? t.sending : t.submit}
      </button>
    </form>
  );
}