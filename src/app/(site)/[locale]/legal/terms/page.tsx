import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalDocument, LegalReviewNotice } from "@/components/legal/legal-document";

const EN = "Terms of Use";
const ES = "Términos de Uso";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isES = locale === "es";
  return {
    title: isES ? ES : EN,
    alternates: {
      canonical: isES ? "/es/legal/terminos" : "/legal/terms",
      languages: {
        "en-US": "/legal/terms",
        "es-US": "/es/legal/terminos",
        "x-default": "/legal/terms",
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
  const isES = locale === "es";

  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto w-[92%] max-w-[760px]">
        <h1 className="font-display text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold leading-tight tracking-[-0.03em] text-brand-primary">
          {isES ? ES : EN}
        </h1>
        <LegalReviewNotice locale={locale} />
        <div className="mt-8">
          <LegalDocument slug="terms" locale={locale} />
        </div>
      </div>
    </section>
  );
}
