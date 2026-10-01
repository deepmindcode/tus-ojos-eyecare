import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LOCATIONS } from "@/config/site";
import { loadContent } from "@/lib/content";
import { ContentPageBody } from "@/components/content/content-page";

/**
 * Pagina de una sede.
 *
 * El slug de la URL es distinto en cada idioma (`slug` / `slugES`), pero
 * el archivo de contenido es uno solo, con el nombre del slug en ingles.
 * Asi no hay que duplicar el markdown para cambiar una direccion.
 */

function findLocation(slug: string) {
  return LOCATIONS.find(
    (l) => l.active && (l.slug === slug || l.slugES === slug),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const location = findLocation(slug);
  if (!location) return {};

  const isES = locale === "es";
  const content = await loadContent(`locations/${location.slug}`, locale);

  const en = `/locations/${location.slug}`;
  const es = `/es/ubicaciones/${location.slugES}`;

  return {
    title: content?.title || (isES ? location.nameES : location.nameEN),
    description: content?.description || undefined,
    alternates: {
      canonical: isES ? es : en,
      languages: { "en-US": en, "es-US": es, "x-default": en },
    },
  };
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const location = findLocation(slug);
  if (!location) notFound();

  const content = await loadContent(`locations/${location.slug}`, locale);
  if (!content) notFound();

  return (
    <ContentPageBody
      content={content}
      locale={locale}
      breadcrumb={
        <Link href="/locations" className="hover:text-brand-primary">
          {locale === "es" ? "Oficinas" : "Offices"}
        </Link>
      }
    />
  );
}