import { BRAND, LOCATIONS } from "@/config/site";

/**
 * src/lib/schema.ts
 *
 * Datos estructurados (JSON-LD) para Google.
 *
 * Dos reglas que no se rompen:
 *
 *   - Solo se declara lo que la pagina dice de verdad. Marcar una
 *     valoracion, un precio o una especialidad que no existe en el sitio
 *     es motivo de penalizacion, y en una practica de salud tambien es
 *     publicidad enganosa.
 *   - Nunca `aggregateRating` ni `review`: no hay resenas propias que
 *     declarar, y fabricarlas seria mentir en un formato que Google lee
 *     como verdad.
 *
 * El tipo es `Optician`, no `MedicalClinic`: es lo que el negocio es.
 */

type Json = Record<string, unknown>;

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tusojoseyecare.com").replace(/\/$/, "");
}

function absolute(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

type Location = (typeof LOCATIONS)[number];

/** Horario en el formato que Google espera. */
function openingHours(l: Location): Json[] {
  return l.hours.map((h) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: h.dayOfWeek,
    opens: h.opens,
    closes: h.closes,
  }));
}

/** Una sede como negocio local. */
export function opticianSchema(l: Location, locale: string): Json {
  const isES = locale === "es";
  const path = isES ? `/es/ubicaciones/${l.slugES}` : `/locations/${l.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "Optician",
    "@id": absolute(path),
    name: `${BRAND.name} — ${l.city}`,
    knowsLanguage: ["es-US", "en-US"],
    image: absolute("/brand/logo-lockup.png"),
    url: absolute(path),
    telephone: l.phoneE164,
    address: {
      "@type": "PostalAddress",
      streetAddress: l.addressLine1,
      addressLocality: l.city,
      addressRegion: l.state,
      postalCode: l.postalCode,
      addressCountry: "US",
    },
    ...(l.latitude !== null && l.longitude !== null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: l.latitude,
            longitude: l.longitude,
          },
        }
      : {}),
    ...(l.googleMapsUrl ? { hasMap: l.googleMapsUrl } : {}),
    openingHoursSpecification: openingHours(l),
    // Declarado porque el sitio lo dice en cada pagina de sede y es
    // verificable en la oficina.
    isAccessibleForFree: false,
    currenciesAccepted: "USD",
    availableLanguage: [
      { "@type": "Language", name: "English" },
      { "@type": "Language", name: "Spanish" },
    ],
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Free parking", value: true },
      { "@type": "LocationFeatureSpecification", name: "Wheelchair accessible", value: true },
    ],
    parentOrganization: { "@id": `${siteUrl()}/#organization` },
  };
}

/** La empresa, con sus tres sedes. Va una vez por pagina. */
export function organizationSchema(locale: string): Json {
  const isES = locale === "es";
  const active = LOCATIONS.filter((l) => l.active);
  const principal = active.find((l) => l.isPrincipal) ?? active[0];

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl()}/#organization`,
    name: BRAND.name,
    knowsLanguage: ["es-US", "en-US"],
    url: isES ? absolute("/es") : siteUrl(),
    logo: absolute("/brand/logo-lockup.png"),
    image: absolute("/brand/logo-lockup.png"),
    foundingDate: String(BRAND.foundedYear),
    slogan: isES ? BRAND.tagline.es : BRAND.tagline.en,
    // La direccion de la empresa es la de la sede principal, leida de
    // LOCATIONS. Tenerla escrita dos veces garantiza que un dia dejen de
    // coincidir.
    ...(principal
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: principal.addressLine1,
            addressLocality: principal.city,
            addressRegion: principal.state,
            postalCode: principal.postalCode,
            addressCountry: "US",
          },
          telephone: principal.phoneE164,
        }
      : {}),
    contactPoint: LOCATIONS.filter((l) => l.active).map((l) => ({
      "@type": "ContactPoint",
      telephone: l.phoneE164,
      contactType: "customer service",
      areaServed: `${l.city}, ${l.state}`,
      availableLanguage: ["en", "es"],
    })),
    location: LOCATIONS.filter((l) => l.active).map((l) => ({
      "@id": absolute(isES ? `/es/ubicaciones/${l.slugES}` : `/locations/${l.slug}`),
    })),
  };
}

/** Lista de sedes para el indice. */
export function locationListSchema(locale: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: LOCATIONS.filter((l) => l.active).map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: opticianSchema(l, locale),
    })),
  };
}

/**
 * Preguntas frecuentes.
 *
 * Solo se declara lo que esta escrito en la pagina. Si una respuesta no
 * aparece visible, no se marca: Google lo considera contenido oculto.
 */
export function faqSchema(items: ReadonlyArray<{ q: string; a: string }>): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

/** Un articulo de salud visual. Sin autor inventado. */
export function articleSchema(opts: {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly locale: string;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    url: absolute(opts.path),
    inLanguage: opts.locale === "es" ? "es-US" : "en-US",
    publisher: { "@id": `${siteUrl()}/#organization` },
    isAccessibleForFree: true,
  };
}

/**
 * Un servicio concreto, prestado por la empresa en sus tres sedes.
 *
 * `provider` apunta a la Organization por `@id` en vez de repetirla: asi
 * Google entiende que las nueve paginas de servicio son del mismo
 * negocio, no de nueve negocios distintos.
 *
 * No se declara `offers` ni precio. Un precio en datos estructurados es
 * una oferta vinculante, y aqui cada caso se valora en consulta.
 */
export function serviceSchema(opts: {
  readonly name: string;
  readonly description: string;
  readonly path: string;
  readonly locale: string;
}): Json {
  const active = LOCATIONS.filter((l) => l.active);

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    serviceType: opts.name,
    url: absolute(opts.path),
    provider: { "@id": `${siteUrl()}/#organization` },
    areaServed: active.map((l) => ({
      "@type": "City",
      name: l.city,
      containedInPlace: { "@type": "State", name: l.state },
    })),
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: absolute(opts.locale === "es" ? "/es/cita" : "/appointment"),
      servicePhone: active.map((l) => ({
        "@type": "ContactPoint",
        telephone: l.phoneE164,
        areaServed: l.city,
        availableLanguage: ["en", "es"],
      })),
    },
  };
}

/** Migas de pan, para que Google muestre la ruta en el resultado. */
export function breadcrumbSchema(
  trail: ReadonlyArray<{ name: string; path: string }>,
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: absolute(t.path),
    })),
  };
}