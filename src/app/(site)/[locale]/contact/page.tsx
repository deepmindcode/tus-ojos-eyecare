import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { loadContent } from "@/lib/content";
import { ContentPageBody } from "@/components/content/content-page";

/**
 * Pagina de contacto. El aviso de urgencias vive en el markdown.
 *
 * El texto vive en `content/contact.{en,es}.md`. La pagina solo lo coloca:
 * asi la oficina puede corregir una frase sin tocar codigo.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isES = locale === "es";
  const content = await loadContent("contact", locale);

  return {
    title: content?.title || (isES ? "Contacto" : "Contact"),
    description: content?.description || undefined,
    alternates: {
      canonical: isES ? "/es/contacto" : "/contact",
      languages: {
        "en-US": "/contact",
        "es-US": "/es/contacto",
        "x-default": "/contact",
      },
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const content = await loadContent("contact", locale);
  if (!content) notFound();

  return <ContentPageBody content={content} locale={locale} />;
}