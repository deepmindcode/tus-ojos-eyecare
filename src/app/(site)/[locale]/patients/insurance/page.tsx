import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { loadContent } from "@/lib/content";
import { ContentPageBody } from "@/components/content/content-page";

/**
 * Seguros y formas de pago.
 *
 * El texto vive en `content/patients/insurance.{en,es}.md`. La pagina solo lo coloca:
 * asi la oficina puede corregir una frase sin tocar codigo.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isES = locale === "es";
  const content = await loadContent("patients/insurance", locale);

  return {
    title: content?.title || (isES ? "Seguros" : "Insurance"),
    description: content?.description || undefined,
    alternates: {
      canonical: isES ? "/es/pacientes/seguros" : "/patients/insurance",
      languages: {
        "en-US": "/patients/insurance",
        "es-US": "/es/pacientes/seguros",
        "x-default": "/patients/insurance",
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

  const content = await loadContent("patients/insurance", locale);
  if (!content) notFound();

  return <ContentPageBody content={content} locale={locale} />;
}