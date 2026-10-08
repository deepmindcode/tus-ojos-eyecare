import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Host del proyecto Supabase. Se fija para no convertir el optimizador
// de imágenes en un proxy abierto hacia cualquier proyecto ajeno.
const SUPABASE_HOST = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
).hostname;

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    // interest-cohort ya no existe (FLoC se retiró). browsing-topics es el actual.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // CSP completa en FASE 7, cuando estén inventariados Turnstile,
  // fuentes y el sistema de consentimiento.
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /**
   * Redirecciones del sitio anterior.
   *
   * Las rutas salen del menu y el pie del WordPress archivado en Wayback
   * (captura de junio de 2026). Se usan 301 explicitos y no `permanent`,
   * que en Next emite 308: los dos valen para Google, pero 301 es lo que
   * esperan ver las herramientas de auditoria.
   *
   * No se redirige /services ni /appointment porque existen igual.
   */
  async redirects() {
    const moved = (source: string, destination: string) => ({
      source,
      destination,
      statusCode: 301 as const,
    });

    return [
      moved("/about-us", "/about"),
      moved("/contact-us", "/contact"),
      moved("/faq", "/patients/faq"),

      // "Treatments" se repartio entre las paginas de servicio; el indice
      // es el destino honesto, no una pagina concreta que quiza no era la
      // que buscaban.
      moved("/treatments", "/services"),
      moved("/treatments/:path*", "/services"),

      moved("/blog", "/eye-health"),
      moved("/blog/:path*", "/eye-health"),

      moved("/privacy-policy", "/legal/privacy"),
      moved("/terms-of-use", "/legal/terms"),

      // No hay pagina de empleo todavia: contacto es donde pueden escribir.
      moved("/recruitment", "/contact"),

      moved("/shop", "/services/optical-and-frames"),
      moved("/before-after", "/services"),

      moved("/home", "/"),
      moved("/index.php", "/"),
    ];
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/admin/:path*",
        headers: [
          ...securityHeaders,
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
        ],
      },
      // Los archivos de `public/` no cambian nunca sin cambiar de nombre:
      // el logotipo, la foto, los iconos. Sin esta cabecera el navegador
      // vuelve a preguntar por ellos en cada visita aunque ya los tenga.
      //
      // Va DESPUES de la regla de /admin a proposito: las reglas se
      // acumulan en orden y no debe pisar el `no-store` del panel.
      {
        source: "/:file(.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico|woff2))",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: SUPABASE_HOST,
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Un SVG subido al CMS puede contener <script>. No lo habilites.
    dangerouslyAllowSVG: false,
    // Una foto reescalada se guarda un ano. El valor por defecto son 60
    // segundos, y con eso el optimizador vuelve a recodificar la misma
    // imagen una y otra vez sin que nada haya cambiado.
    minimumCacheTTL: 31_536_000,
  },
  typescript: { ignoreBuildErrors: false },
};

export default withNextIntl(nextConfig);
