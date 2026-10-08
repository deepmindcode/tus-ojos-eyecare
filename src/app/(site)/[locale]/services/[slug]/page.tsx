import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { loadContent, listContentSlugs } from "@/lib/content";
import { routing } from "@/i18n/routing";
import { ContentPageBody } from "@/components/content/content-page";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/schema";
import { faqFromBold } from "@/lib/faq";

/**
 * Pagina de un servicio. El slug es el nombre del archivo en
 * `content/services/`, igual en los dos idiomas: la URL en espanol
 * cambia el tramo (/servicios/) pero no el slug del servicio.
 *
 * Se prerenderizan todas al publicar. La lista no se escribe a mano:
 * sale de leer la carpeta `content/services/`, asi que anadir un
 * servicio es anadir un archivo y nada mas.
 */

/**
 * Prerenderizado de todas las fichas en las dos lenguas.
 *
 * Antes no estaba, por no tener que mantener una lista a mano. Pero la
 * lista no hace falta escribirla: `listContentSlugs` lee la carpeta, y
 * ya se usaba para el sitemap. Sin esto, la primera persona que entra a
 * cada ficha despues de publicar espera a que se genere.
 */
export async function generateStaticParams() {
  const slugs = await listContentSlugs("services");
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const isES = locale === "es";
  const content = await loadContent(`services/${slug}`, locale);

  if (!content) return { title: isES ? "Servicio" : "Service" };

  const en = `/services/${slug}`;
  const es = `/es/servicios/${slug}`;

  return {
    title: content.title || undefined,
    description: content.description || undefined,
    alternates: {
      canonical: isES ? es : en,
      languages: { "en-US": en, "es-US": es, "x-default": en },
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const content = await loadContent(`services/${slug}`, locale);
  if (!content) notFound();

  const isES = locale === "es";
  const path = isES ? `/es/servicios/${slug}` : `/services/${slug}`;
  const name = content.title.split(" | ")[0]!;

  // Las preguntas salen del propio markdown: lo que se declara es
  // exactamente lo que el visitante lee en la pagina.
  const faq = faqFromBold(content.body);

  return (
    <>
      <JsonLd
        data={serviceSchema({
          name,
          description: content.description,
          path,
          locale,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          {
            name: isES ? "Servicios" : "Services",
            path: isES ? "/es/servicios" : "/services",
          },
          { name, path },
        ])}
      />
      {faq.length > 0 && <JsonLd data={faqSchema(faq)} />}

      <ContentPageBody
        content={content}
        locale={locale}
        breadcrumb={
          <Link href="/services" className="hover:text-brand-primary">
            {isES ? "Servicios" : "Services"}
          </Link>
        }
      />
    </>
  );
}