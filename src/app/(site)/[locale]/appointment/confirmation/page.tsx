import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { CheckCircle2, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LOCATIONS } from "@/config/site";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Confirmación de envío.
 *
 * El mensaje es deliberadamente claro en que la cita NO está confirmada
 * (§17). Alguien que crea tener hora y se presente en la oficina se lleva
 * un mal rato y le complica la mañana a recepción.
 *
 * La URL no lleva ningún dato de la solicitud: nada de nombre, teléfono
 * ni identificador en la barra de direcciones ni en el historial.
 */
export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("appointment.confirmation");
  const tc = await getTranslations("common");

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto w-[92%] max-w-[680px]">
        <CheckCircle2 className="size-12 text-brand-secondary-deep" aria-hidden="true" />

        <h1 className="mt-5 font-display text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold leading-tight tracking-[-0.03em] text-brand-primary">
          {t("heading")}
        </h1>

        <p className="mt-4 rounded-r-xl border-l-4 border-brand-primary bg-brand-primary-tint p-5 text-[1.02rem]">
          <strong className="text-brand-primary">{t("notConfirmedStrong")}</strong>{" "}
          {t("notConfirmedRest")}
        </p>

        <h2 className="mt-10 font-display text-xl font-bold">{t("whatNext")}</h2>
        <ol className="mt-4 grid gap-3">
          {["one", "two", "three"].map((k, i) => (
            <li key={k} className="flex gap-3">
              <span
                className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-secondary-tint font-display text-sm font-bold text-brand-secondary-deep"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span className="text-text-secondary">{t(`next.${k}`)}</span>
            </li>
          ))}
        </ol>

        <h2 className="mt-10 font-display text-xl font-bold">{t("needSooner")}</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {LOCATIONS.filter((l) => l.active).map((l) => (
            <li key={l.id}>
              <a
                href={`tel:${l.phoneE164}`}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-border-subtle bg-surface px-3 text-sm font-bold text-brand-secondary-deep hover:border-brand-secondary"
              >
                <Phone className="size-4" aria-hidden="true" />
                {l.city}
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-full bg-brand-primary px-6 font-bold text-white hover:bg-brand-primary-deep"
          >
            {t("backHome")}
          </Link>
          <Link
            href="/patients/first-visit"
            className="inline-flex min-h-11 items-center rounded-full border-2 border-brand-primary px-6 font-bold text-brand-primary hover:bg-brand-primary-tint"
          >
            {tc("learnMore")}
          </Link>
        </div>
      </div>
    </section>
  );
}
