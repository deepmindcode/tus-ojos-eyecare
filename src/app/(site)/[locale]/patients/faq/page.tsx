import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { loadContent } from "@/lib/content";
import { ContentPageBody } from "@/components/content/content-page";

/**
 * Preguntas frecuentes. Da 404 hasta que exista el markdown.
 *
 * El texto vive en `content/patients/faq.{en,es}.md`. La pagina solo lo coloca:
 * asi la oficina puede corregir una frase sin tocar codigo.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isES = locale === "es";
  const content = await loadContent("patients/faq", locale);

  return {
    title: content?.title || (isES ? "Preguntas frecuentes" : "Frequently Asked Questions"),
    description: content?.description || undefined,
    alternates: {
      canonical: isES ? "/es/pacientes/preguntas-frecuentes" : "/patients/faq",
      languages: {
        "en-US": "/patients/faq",
        "es-US": "/es/pacientes/preguntas-frecuentes",
        "x-default": "/patients/faq",
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

  const content = await loadContent("patients/faq", locale);
  if (!content) notFound();

  return <ContentPageBody content={content} locale={locale} />;
}