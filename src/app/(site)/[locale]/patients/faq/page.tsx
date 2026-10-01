import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { loadContent } from "@/lib/content";
import { ContentPageBody } from "@/components/content/content-page";
import { JsonLd } from "@/components/seo/json-ld";
import { faqSchema } from "@/lib/schema";

/**
 * Preguntas frecuentes.
 *
 * Las preguntas se extraen del propio markdown para los datos
 * estructurados. Asi nunca se declara a Google una respuesta que no este
 * visible en la pagina: la fuente es la misma.
 */

/** Saca los pares pregunta/respuesta de los encabezados `###`. */
function extractFaq(body: string): Array<{ q: string; a: string }> {
  const out: Array<{ q: string; a: string }> = [];
  const parts = body.split(/^### +/m).slice(1);

  for (const part of parts) {
    const [head, ...rest] = part.split("\n");
    const q = (head ?? "").trim();
    const a = rest
      .join(" ")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    if (q && a) out.push({ q, a });
  }

  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isES = locale === "es";
  const content = await loadContent("patients/faq", locale);

  return {
    title: content?.title || (isES ? "Preguntas frecuentes" : "Frequently asked questions"),
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

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const content = await loadContent("patients/faq", locale);
  if (!content) notFound();

  const items = extractFaq(content.body);

  return (
    <>
      {items.length > 0 && <JsonLd data={faqSchema(items)} />}
      <ContentPageBody content={content} locale={locale} />
    </>
  );
}