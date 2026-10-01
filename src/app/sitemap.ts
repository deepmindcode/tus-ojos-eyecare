import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { LOCATIONS } from "@/config/site";
import { listContentSlugs } from "@/lib/content";

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

/**
 * Paginas que viven como archivos en `content/`: un servicio o un
 * articulo nuevo entra en el sitemap por existir, sin que nadie tenga
 * que acordarse de anadirlo aqui.
 */
async function fromContent(
  folder: string,
  enPrefix: string,
  esPrefix: string,
  priority: number,
): Promise<MetadataRoute.Sitemap> {
  const slugs = await listContentSlugs(folder);

  return slugs.flatMap((slug) => {
    const en = `${BASE}${enPrefix}/${slug}`;
    const es = `${BASE}${esPrefix}/${slug}`;
    const alternates = { languages: { "en-US": en, "es-US": es } };

    return [en, es].map((u) => ({
      url: u,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority,
      alternates,
    }));
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  // Las nueve paginas de servicio y los articulos de salud visual. El
  // slug es el mismo en los dos idiomas; lo que cambia es el tramo.
  entries.push(
    ...(await fromContent("services", "/services", "/es/servicios", 0.85)),
    ...(await fromContent("eye-health", "/eye-health", "/es/salud-visual", 0.6)),
  );

  return entries;
}
