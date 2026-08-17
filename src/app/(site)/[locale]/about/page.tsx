import type { Metadata } from "next";
import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND, LOCATIONS } from "@/config/site";

/**
 * Página Nosotros. Vive aparte de la home a propósito: la historia del
 * negocio merece su propio espacio y la portada debe llevar a agendar,
 * no convertirse en una landing con todo apilado.
 *
 * Wilfredo Manzano es ÓPTICO. Su bloque lo dice sin ambigüedad y no
 * insinúa que realice exámenes ni diagnósticos: eso corresponde a un
 * optometrista licenciado. Los servicios clínicos se describen a nivel
 * de empresa ("nuestro equipo"), nunca atribuidos a él.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: locale === "es" ? "/es/nosotros" : "/about",
      languages: { "en-US": "/about", "es-US": "/es/nosotros", "x-default": "/about" },
    },
  };
}

function Eyebrow({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-secondary-deep">
      <span
        className="size-3 shrink-0 rounded-full border-[3px] border-brand-secondary"
        aria-hidden="true"
      />
      {children}
    </p>
  );
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const tc = await getTranslations("common");
  const isES = locale === "es";
  const years = new Date().getFullYear() - BRAND.foundedYear;

  return (
    <>
      {/* ---------- Quiénes somos ---------- */}
      <section className="bg-[radial-gradient(800px_500px_at_85%_0%,var(--color-brand-secondary-tint)_0%,transparent_60%)] py-14 lg:py-20">
        <div className="mx-auto w-[92%] max-w-[1200px]">
          <Eyebrow>{t("who.eyebrow")}</Eyebrow>
          <h1 className="max-w-[22ch] font-display text-[clamp(2rem,4.5vw,3.2rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-brand-primary">
            {t("who.heading")}
          </h1>

          <div className="mt-7 grid gap-5 lg:grid-cols-2 lg:gap-x-14">
            <p className="text-[1.08rem] text-text-secondary">{t("who.p1")}</p>
            <p className="text-[1.08rem] text-text-secondary">{t("who.p2")}</p>
            <p className="text-text-secondary">{t("who.p3")}</p>
            <p className="self-start border-l-[3px] border-brand-secondary pl-4 font-display text-[1.15rem] font-semibold leading-snug text-brand-primary">
              {t("who.closing")}
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Wilfredo Manzano ---------- */}
      <section className="border-y border-border-subtle bg-surface py-14 lg:py-20">
        <div className="mx-auto grid w-[92%] max-w-[1200px] items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="overflow-hidden rounded-2xl border border-border-subtle">
            <Image
              src="/images/wilfredo-manzano.jpg"
              alt={t("owner.photoAlt")}
              width={880}
              height={1100}
              className="h-auto w-full object-cover"
            />
          </div>

          <div>
            <Eyebrow>{t("owner.eyebrow")}</Eyebrow>
            <h2 className="font-display text-[1.9rem] font-extrabold leading-tight tracking-[-0.02em] text-brand-primary">
              Wilfredo Manzano
            </h2>
            <p className="mt-1 text-[0.76rem] font-bold uppercase tracking-[0.14em] text-brand-secondary-deep">
              {t("owner.role")}
            </p>

            <p className="mt-6 text-text-secondary">{t("owner.p1")}</p>
            <p className="mt-4 text-text-secondary">{t("owner.p2")}</p>
            <p className="mt-4 text-text-secondary">{t("owner.p3")}</p>

            <p className="mt-7 border-l-[3px] border-brand-secondary pl-4 font-display text-[1.08rem] font-semibold italic text-brand-primary">
              {isES ? BRAND.tagline.es : BRAND.tagline.en}
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Nuestra filosofía ---------- */}
      <section className="bg-brand-secondary-tint py-14 lg:py-20">
        <div className="mx-auto w-[92%] max-w-[1200px]">
          <Eyebrow>{t("philosophy.eyebrow")}</Eyebrow>
          <h2 className="max-w-[24ch] font-display text-[clamp(1.7rem,3.4vw,2.5rem)] font-bold leading-tight tracking-[-0.028em] text-brand-primary">
            {t("philosophy.heading")}
          </h2>

          <p className="mt-6 max-w-[40ch] font-display text-[1.3rem] font-semibold leading-snug">
            {t("philosophy.lead")}
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <p className="text-text-secondary">{t("philosophy.p1")}</p>
            <p className="text-text-secondary">{t("philosophy.p2")}</p>
            <p className="text-text-secondary">{t("philosophy.p3")}</p>
          </div>

          <p className="mt-12 font-display text-[clamp(1.5rem,3.2vw,2.2rem)] font-extrabold tracking-[-0.025em] text-brand-primary">
            {t("philosophy.closing")}
          </p>
        </div>
      </section>

      {/* ---------- Cifras y CTA ---------- */}
      <section className="py-14 lg:py-20">
        <div className="mx-auto w-[92%] max-w-[1200px]">
          <h2 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] font-bold tracking-[-0.025em]">
            {t("numbers.heading")}
          </h2>
          <dl className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                v: t("numbers.yearsValue", { years }),
                l: t("numbers.yearsLabel", { year: BRAND.foundedYear }),
              },
              { v: BRAND.patientsServed.toLocaleString("en-US"), l: t("numbers.patientsLabel") },
              {
                v: String(LOCATIONS.filter((l) => l.active).length),
                l: t("numbers.officesLabel"),
              },
            ].map((n) => (
              <div key={n.l} className="border-l-[3px] border-brand-secondary-tint pl-4">
                <dt className="sr-only">{n.l}</dt>
                <dd>
                  <span className="block font-display text-3xl font-bold text-brand-primary">
                    {n.v}
                  </span>
                  <span className="mt-1 block text-sm text-text-secondary">{n.l}</span>
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-wrap gap-3">
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
              {t("seeLocations")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
