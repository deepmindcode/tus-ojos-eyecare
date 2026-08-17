import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/config/site";

/**
 * Hero. El titular es el jingle de la marca y NO se traduce: "Tus ojos,
 * tus ojos, tus ojos…" es el nombre con el que la comunidad reconoce el
 * negocio, en inglés y en español. Las repeticiones bajan de opacidad
 * para que el ojo "oiga" el eco.
 *
 * El H1 no lleva palabras clave a propósito; el peso de SEO lo cargan el
 * <title> y el H2 de la sección de servicios.
 */
export function Hero({ locale }: { readonly locale: string }) {
  const t = useTranslations("home.hero");
  const tc = useTranslations("common");
  const isES = locale === "es";

  return (
    <section className="relative overflow-hidden bg-[radial-gradient(900px_600px_at_92%_0%,var(--color-brand-secondary-tint)_0%,transparent_60%),radial-gradient(700px_500px_at_0%_100%,var(--color-brand-primary-tint)_0%,transparent_55%)] py-12 sm:py-16 lg:py-24">
      <div className="mx-auto grid w-[92%] max-w-[1200px] items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
        <div>
          <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-secondary-deep">
            <span
              className="size-3 shrink-0 rounded-full border-[3px] border-brand-secondary"
              aria-hidden="true"
            />
            Camden · Philadelphia · Cherry Hill
          </p>

          <h1 className="font-display text-[clamp(2.35rem,5.4vw,4rem)] font-extrabold leading-none tracking-[-0.035em] text-brand-primary">
            Tus ojos, <span className="opacity-70">tus ojos,</span>{" "}
            <span className="opacity-45">tus ojos…</span>
          </h1>

          <p className="mt-4 max-w-[32ch] border-l-[3px] border-brand-secondary pl-4 font-display text-[clamp(1.05rem,2vw,1.4rem)] font-semibold leading-tight">
            {isES ? BRAND.tagline.es : BRAND.tagline.en}
            <span className="mt-1 block font-sans text-sm font-medium text-text-secondary">
              {isES ? BRAND.tagline.en : BRAND.tagline.es}
            </span>
          </p>

          <p className="mt-6 max-w-[47ch] text-[1.08rem] text-text-secondary">{t("lede")}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/appointment"
              className="inline-flex min-h-11 items-center rounded-full bg-brand-primary px-6 font-bold text-white hover:bg-brand-primary-deep"
            >
              {tc("schedule")}
            </Link>
            <Link
              href="/locations"
              className="inline-flex min-h-11 items-center rounded-full border-2 border-brand-primary px-6 font-bold text-brand-primary hover:bg-brand-primary-tint"
            >
              {t("findOffice")}
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-2">
            {["bilingual", "insurance", "hours"].map((k) => (
              <li
                key={k}
                className="rounded-full border border-border-subtle bg-surface px-3.5 py-1.5 text-sm font-semibold text-text-secondary"
              >
                {t(`chips.${k}`)}
              </li>
            ))}
          </ul>
        </div>

        {/* Composición de lente: aros concéntricos alrededor de la foto */}
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px] lg:max-w-none">
          <div className="absolute -inset-[3%] rounded-full border border-brand-secondary opacity-40" aria-hidden="true" />
          <div className="absolute inset-[3%] rounded-full border border-brand-secondary opacity-60" aria-hidden="true" />
          <div className="absolute inset-[9%] rounded-full border-2 border-brand-primary opacity-30" aria-hidden="true" />
          <div className="absolute inset-[12%] overflow-hidden rounded-full bg-brand-secondary-tint">
            <Image
              src="/images/hero.jpg"
              alt={t("photoAlt")}
              fill
              sizes="(max-width: 1024px) 90vw, 40vw"
              className="object-cover object-[center_25%]"
              priority
            />
          </div>
          <div className="absolute bottom-[3%] left-0 rounded-2xl border border-border-subtle bg-surface px-4 py-3 shadow-lg lg:-left-[4%]">
            <p className="font-display text-[0.92rem] font-bold text-brand-primary">{t("openLabel")}</p>
            <p className="text-sm text-text-secondary">9:00 AM – 6:00 PM</p>
          </div>
        </div>
      </div>
    </section>
  );
}
