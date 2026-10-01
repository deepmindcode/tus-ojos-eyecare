import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { loadContent } from "@/lib/content";
import { ContentPageBody } from "@/components/content/content-page";
import { ContactForm } from "@/components/forms/contact-form";

/**
 * Pagina de contacto. El texto (direcciones, telefonos, aviso de
 * urgencias) vive en `content/contact.{en,es}.md`; el formulario va
 * debajo, para que quien solo quiere el telefono lo vea primero.
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

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const content = await loadContent("contact", locale);
  if (!content) notFound();

  return (
    <>
      <ContentPageBody content={content} locale={locale} />

      <section className="pb-16">
        <div className="mx-auto w-[92%] max-w-[760px] rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8">
          <ContactForm locale={locale} />
        </div>
      </section>
    </>
  );
}