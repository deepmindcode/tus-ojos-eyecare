import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LOCATIONS } from "@/config/site";

/**
 * Tarjetas de ubicación (§38). Cada una ofrece las cuatro acciones:
 * Agendar, Llamar, Texto y Cómo llegar.
 *
 * "Cómo llegar" abre el enlace oficial de Google Maps de esa oficina —
 * no un mapa incrustado. Un iframe de Maps en cada página carga cientos
 * de kilobytes y coloca cookies de terceros antes de que el visitante
 * haya consentido nada.
 */
export function LocationsGrid({ locale }: { readonly locale: string }) {
  const t = useTranslations("home.locations");
  const tc = useTranslations("common");
  const isES = locale === "es";

  return (
    <section id="locations" className="border-y border-border-subtle bg-surface py-16 lg:py-24">
      <div className="mx-auto w-[92%] max-w-[1200px]">
        <div className="mb-10 max-w-[62ch]">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-secondary-deep">
            <span className="size-3 shrink-0 rounded-full border-[3px] border-brand-secondary" aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h2 className="font-display text-[clamp(1.7rem,3.4vw,2.5rem)] font-bold leading-tight tracking-[-0.028em]">
            {t("heading")}
          </h2>
          <p className="mt-3 text-[1.03rem] text-text-secondary">{t("intro")}</p>
        </div>

        <ul className="grid gap-5 lg:grid-cols-3">
          {LOCATIONS.filter((l) => l.active).map((l) => (
            <li
              key={l.id}
              className="flex flex-col rounded-2xl border border-border-subtle bg-background p-6"
            >
              <h3 className="font-display text-[1.3rem] font-bold text-brand-primary">
                {isES ? l.nameES : l.nameEN}
              </h3>
              <address className="mt-2 not-italic text-[0.95rem] text-text-secondary">
                {l.addressLine1}
                <br />
                {l.city}, {l.state} {l.postalCode}
              </address>
              <a
                href={`tel:${l.phoneE164}`}
                className="mt-2 font-display text-[1.35rem] font-bold tracking-[-0.01em] text-brand-secondary-deep hover:underline"
              >
                {l.phone}
              </a>
              <p className="mt-1 text-[0.87rem] text-text-secondary">
                {isES ? l.hours.daysES : l.hours.daysEN} · {l.hours.time}
              </p>

              <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                <Link
                  href="/appointment"
                  className="col-span-2 flex min-h-11 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-white hover:bg-brand-primary-deep"
                >
                  {tc("scheduleShort")}
                </Link>
                <a
                  href={`tel:${l.phoneE164}`}
                  className="flex min-h-11 items-center justify-center rounded-full border-2 border-border-subtle bg-surface text-sm font-bold text-brand-secondary-deep hover:border-brand-secondary"
                >
                  {tc("call")}
                </a>
                <a
                  href={`sms:${l.smsE164}`}
                  className="flex min-h-11 items-center justify-center rounded-full border-2 border-border-subtle bg-surface text-sm font-bold text-brand-secondary-deep hover:border-brand-secondary"
                >
                  {tc("text")}
                </a>
                <a
                  href={l.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="col-span-2 flex min-h-11 items-center justify-center rounded-full border-2 border-border-subtle bg-surface text-sm font-bold text-brand-secondary-deep hover:border-brand-secondary"
                >
                  {tc("directions")}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
