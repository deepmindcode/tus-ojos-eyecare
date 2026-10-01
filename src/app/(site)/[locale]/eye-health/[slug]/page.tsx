import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadContent } from "@/lib/content";
import { ContentPageBody } from "@/components/content/content-page";
import { JsonLd } from "@/components/seo/json-ld";
import { articleSchema } from "@/lib/schema";

/**
 * Articulo de salud visual. El slug es el nombre del archivo, igual en
 * los dos idiomas; lo que cambia es el tramo de la URL (/salud-visual/).
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const content = await loadContent(`eye-health/${slug}`, locale);
  if (!content) return {};

  const en = `/eye-health/${slug}`;
  const es = `/es/salud-visual/${slug}`;

  return {
    title: content.title || undefined,
    description: content.description || undefined,
    alternates: {
      canonical: locale === "es" ? es : en,
      languages: { "en-US": en, "es-US": es, "x-default": en },
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const content = await loadContent(`eye-health/${slug}`, locale);
  if (!content) notFound();

  return (
    <>
      <JsonLd
        data={articleSchema({
          title: content.title.split(" | ")[0]!,
          description: content.description,
          path: locale === "es" ? `/es/salud-visual/${slug}` : `/eye-health/${slug}`,
          locale,
        })}
      />
      <ContentPageBody
        content={content}
        locale={locale}
        breadcrumb={
          <Link href="/eye-health" className="hover:text-brand-primary">
            {locale === "es" ? "Salud visual" : "Eye health"}
          </Link>
        }
      />
    </>
  );
}