import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { LOCATIONS } from "@/config/site";

/**
 * Sitemap bilingüe.
 *
 * Cada URL declara sus alternativas de idioma con `alternates.languages`,
 * que es como Google entiende que /about y /es/nosotros son la misma
 * página en dos idiomas y no contenido duplicado.
 *
 * Se excluyen a propósito: /admin (privado), /appointment y su
 * confirmación (son formularios, no contenido que deba posicionar).
 */

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tusojoseyecare.com";

type StaticPath = keyof typeof routing.pathnames;

const INDEXABLE: readonly StaticPath[] = [
  "/",
  "/about",
  "/contact",
  "/services",
  "/locations",
  "/eye-health",
  "/patients/first-visit",
  "/patients/faq",
  "/patients/insurance",
  "/legal/privacy",
  "/legal/terms",
  "/legal/accessibility",
  "/legal/sms-terms",
  "/legal/cookies",
];

function url(pathname: StaticPath, locale: "en" | "es"): string {
  const entry = routing.pathnames[pathname];
  const localized = typeof entry === "string" ? entry : entry[locale];
  const prefix = locale === "es" ? "/es" : "";
  const clean = localized === "/" ? "" : localized;
  return `${BASE}${prefix}${clean}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const pathname of INDEXABLE) {
    for (const locale of ["en", "es"] as const) {
      entries.push({
        url: url(pathname, locale),
        lastModified: new Date(),
        changeFrequency: pathname.startsWith("/legal") ? "yearly" : "monthly",
        priority: pathname === "/" ? 1 : pathname.startsWith("/legal") ? 0.3 : 0.8,
        alternates: {
          languages: {
            "en-US": url(pathname, "en"),
            "es-US": url(pathname, "es"),
          },
        },
      });
    }
  }

  // Páginas de ubicación: cada sede con su slug propio en cada idioma
  for (const l of LOCATIONS.filter((x) => x.active)) {
    const en = `${BASE}/locations/${l.slug}`;
    const es = `${BASE}/es/ubicaciones/${l.slugES}`;
    for (const u of [en, es]) {
      entries.push({
        url: u,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.9,
        alternates: { languages: { "en-US": en, "es-US": es } },
      });
    }
  }

  return entries;
}
