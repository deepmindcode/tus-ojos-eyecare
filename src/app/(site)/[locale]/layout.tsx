import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Bricolage_Grotesque, Source_Sans_3 } from "next/font/google";
import { routing } from "@/i18n/routing";
import { BRAND } from "@/config/site";
import { UtilityBar } from "@/components/layout/utility-bar";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { MobileCTA } from "@/components/layout/mobile-cta";
import { AccessibilityPanel } from "@/components/accessibility/accessibility-panel";
import { PromotionPopup } from "@/components/promotions/promotion-popup";
import "../../globals.css";

/**
 * Layout raíz del SITIO PÚBLICO.
 *
 * Vive dentro del grupo (site) porque /admin necesita su propio layout
 * raíz: son dos árboles independientes. Next.js permite varios layouts
 * raíz siempre que cada uno viva en su grupo y no exista un layout en
 * src/app/layout.tsx.
 */

const display = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"], // latin-ext cubre los acentos del español
  variable: "--font-bricolage",
  display: "swap",
});

const body = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  variable: "--font-source-sans",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isES = locale === "es";

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: {
      default: isES
        ? "Examen de la Vista y Cuidado de los Ojos en Philadelphia, Camden y Cherry Hill | Tus Ojos"
        : "Eye Care in Philadelphia, Camden & Cherry Hill | Tus Ojos Eyecare",
      template: `%s | ${BRAND.name}`,
    },
    // hreflang: cada idioma apunta a su propia versión canónica.
    // NUNCA canonicalizar español hacia inglés (§70).
    alternates: {
      canonical: isES ? "/es" : "/",
      languages: { "en-US": "/", "es-US": "/es", "x-default": "/" },
    },
    icons: {
      icon: "/favicon.svg",
      // iOS ignora los SVG al guardar en pantalla de inicio: necesita PNG opaco
      apple: "/apple-touch-icon.png",
    },
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <html
      lang={locale === "es" ? "es-US" : "en-US"}
      className={`${display.variable} ${body.variable}`}
    >
      <body className="pb-20 font-sans antialiased lg:pb-0">
        <NextIntlClientProvider>
          <a href="#main" className="skip-link">
            {t("skipToContent")}
          </a>
          <UtilityBar />
          <Navbar />
          <main id="main">{children}</main>
          <Footer />
          <MobileCTA />
          <AccessibilityPanel />
          <PromotionPopup />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
