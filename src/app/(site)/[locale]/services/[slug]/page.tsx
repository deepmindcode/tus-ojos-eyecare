import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { loadContent } from "@/lib/content";
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
 * Sin `generateStaticParams` a proposito: los servicios se escriben de
 * a poco y una lista fija obligaria a recordar actualizarla. Se lee del
 * disco en la peticion y Vercel lo cachea.
 */

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