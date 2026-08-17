import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tusojoseyecare.com";

/**
 * robots.txt
 *
 * Bloquear /admin aquí NO lo protege: robots.txt es una petición de
 * cortesía que cualquiera puede leer, y de hecho anuncia dónde está el
 * panel. La protección real son el middleware, el RBAC del layout y las
 * políticas RLS. Esto sólo evita que aparezca en resultados de búsqueda,
 * junto con la cabecera X-Robots-Tag que ya envía next.config.ts.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/", "/appointment/confirmation"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
