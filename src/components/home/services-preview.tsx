import { useTranslations } from "next-intl";
import { Eye, Glasses, Baby, Droplets, Activity, Sun, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { FEATURED_SERVICES, type Availability } from "@/config/services";

const ICONS = {
  eye: Eye,
  glasses: Glasses,
  baby: Baby,
  droplets: Droplets,
  activity: Activity,
  sun: Sun,
} as const;

/**
 * Uso iconos y no fotografías a propósito: las fotos de stock genéricas
 * de "gente en el oftalmólogo" no dicen nada y además arrastran dudas de
 * licencia. Cuando haya sesión propia en las tres oficinas, se cambian.
 */
export function ServicesPreview() {
  const t = useTranslations("home.services");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const badge: Record<Availability, string> = {
    in_office: "bg-brand-secondary-tint text-brand-secondary-deep",
    evaluation: "bg-[#FBF0DC] text-[#7A5100]",
    referral: "bg-[#FBF0DC] text-[#7A5100]",
  };

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto w-[92%] max-w-[1200px]">
        <div className="mb-10 max-w-[62ch]">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-secondary-deep">
            <span className="size-3 shrink-0 rounded-full border-[3px] border-brand-secondary" aria-hidden="true" />
            {t("eyebrow")}
          </p>
          {/* Este H2 carga las palabras clave locales que el H1 no lleva */}
          <h2 className="font-display text-[clamp(1.7rem,3.4vw,2.5rem)] font-bold leading-tight tracking-[-0.028em]">
            {t("heading")}
          </h2>
          <p className="mt-3 text-[1.03rem] text-text-secondary">{t("intro")}</p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_SERVICES.map((s) => {
            const Icon = ICONS[s.icon];
            return (
              <li key={s.key}>
                <Link
                  href={s.href}
                  className="group flex h-full flex-col gap-2 rounded-2xl border border-border-subtle bg-surface p-6 transition hover:-translate-y-0.5 hover:border-brand-secondary hover:shadow-lg"
                >
                  <Icon className="size-8 text-brand-secondary-deep" aria-hidden="true" />
                  <span
                    className={`mt-2 self-start rounded px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] ${badge[s.availability]}`}
                  >
                    {t(`availability.${s.availability}`)}
                  </span>
                  <h3 className="font-display text-[1.12rem] font-bold tracking-[-0.015em]">
                    {tn(s.key)}
                  </h3>
                  <p className="text-[0.92rem] text-text-secondary">{t(`blurbs.${s.key}`)}</p>
                  <span className="mt-auto flex items-center gap-1 pt-3 text-[0.8rem] font-bold uppercase tracking-[0.05em] text-brand-primary">
                    {tc("learnMore")}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 text-center">
          <Link
            href="/services"
            className="inline-flex min-h-11 items-center rounded-full border-2 border-brand-primary px-6 font-bold text-brand-primary hover:bg-brand-primary-tint"
          >
            {tc("viewAll")}
          </Link>
        </div>
      </div>
    </section>
  );
}
