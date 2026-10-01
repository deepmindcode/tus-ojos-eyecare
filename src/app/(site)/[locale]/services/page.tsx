import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { loadContent } from "@/lib/content";
import { ContentPageBody } from "@/components/content/content-page";

/**
 * Indice de servicios.
 *
 * El texto vive en `content/services.{en,es}.md`. La pagina solo lo coloca:
 * asi la oficina puede corregir una frase sin tocar codigo.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isES = locale === "es";
  const content = await loadContent("services", locale);

  return {
    title: content?.title || (isES ? "Servicios" : "Services"),
    description: content?.description || undefined,
    alternates: {
      canonical: isES ? "/es/servicios" : "/services",
      languages: {
        "en-US": "/services",
        "es-US": "/es/servicios",
        "x-default": "/services",
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

  const content = await loadContent("services", locale);
  if (!content) notFound();

  return <ContentPageBody content={content} locale={locale} />;
}