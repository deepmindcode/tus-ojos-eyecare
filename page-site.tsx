import { setRequestLocale, getTranslations } from "next-intl/server";
import { LOCATIONS, BRAND } from "@/config/site";

/**
 * Home provisional de la FASE 2A. Confirma que el armazón —barra
 * superior, navegación, pie, CTA móvil y panel de accesibilidad—
 * funciona en ambos idiomas. Las secciones reales llegan en 2B.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");
  const isES = locale === "es";

  return (
    <div className="mx-auto w-[92%] max-w-[1200px] py-20">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-secondary-deep">
        Fase 2A · armazón
      </p>

      <h1 className="font-display text-5xl font-extrabold leading-none tracking-tight text-brand-primary sm:text-6xl">
        Tus ojos, tus ojos, tus ojos…
      </h1>

      <p className="mt-4 border-l-[3px] border-brand-secondary pl-4 font-display text-xl text-text-primary">
        {isES ? BRAND.tagline.es : BRAND.tagline.en}
      </p>

      <p className="mt-6 text-text-secondary">{t("hours")}</p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        {LOCATIONS.filter((l) => l.active).map((l) => (
          <li key={l.id} className="rounded-2xl border border-border-subtle bg-surface p-5">
            <h2 className="font-display text-lg font-bold text-brand-primary">
              {isES ? l.nameES : l.nameEN}
            </h2>
            <address className="mt-1 text-sm not-italic text-text-secondary">
              {l.addressLine1}
              <br />
              {l.city}, {l.state} {l.postalCode}
            </address>
            <a
              href={`tel:${l.phoneE164}`}
              className="mt-3 inline-block font-display text-lg font-bold text-brand-secondary-deep hover:underline"
            >
              {l.phone}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
