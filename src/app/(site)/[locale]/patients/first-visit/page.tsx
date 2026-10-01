import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { loadContent } from "@/lib/content";
import { ContentPageBody } from "@/components/content/content-page";

/**
 * Primera visita. Da 404 hasta que exista el markdown.
 *
 * El texto vive en `content/patients/first-visit.{en,es}.md`. La pagina solo lo coloca:
 * asi la oficina puede corregir una frase sin tocar codigo.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isES = locale === "es";
  const content = await loadContent("patients/first-visit", locale);

  return {
    title: content?.title || (isES ? "Tu primera visita" : "Your First Visit"),
    description: content?.description || undefined,
    alternates: {
      canonical: isES ? "/es/pacientes/primera-visita" : "/patients/first-visit",
      languages: {
        "en-US": "/patients/first-visit",
        "es-US": "/es/pacientes/primera-visita",
        "x-default": "/patients/first-visit",
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

  const content = await loadContent("patients/first-visit", locale);
  if (!content) notFound();

  return <ContentPageBody content={content} locale={locale} />;
}