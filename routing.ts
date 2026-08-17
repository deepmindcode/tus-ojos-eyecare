import { defineRouting } from "next-intl/routing";

/**
 * Rutas localizadas. Los slugs en español son independientes, NO
 * traducciones automáticas de la URL en inglés (§68, §69).
 * Inglés vive en la raíz; español bajo /es.
 */
export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  // 'as-needed': el inglés no lleva prefijo, el español sí (/es/...)
  localePrefix: "as-needed",
  // No redirigir por Accept-Language: rompe la señal canónica para Google
  // y confunde a quien llega desde un enlace en inglés.
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/services": { en: "/services", es: "/servicios" },
    "/services/[slug]": { en: "/services/[slug]", es: "/servicios/[slug]" },
    "/locations": { en: "/locations", es: "/ubicaciones" },
    "/locations/[slug]": { en: "/locations/[slug]", es: "/ubicaciones/[slug]" },
    "/patients/first-visit": { en: "/patients/first-visit", es: "/pacientes/primera-visita" },
    "/patients/faq": { en: "/patients/faq", es: "/pacientes/preguntas-frecuentes" },
    "/patients/insurance": { en: "/patients/insurance", es: "/pacientes/seguros" },
    "/eye-health": { en: "/eye-health", es: "/salud-visual" },
    "/eye-health/[slug]": { en: "/eye-health/[slug]", es: "/salud-visual/[slug]" },
    "/about": { en: "/about", es: "/nosotros" },
    "/contact": { en: "/contact", es: "/contacto" },
    "/appointment": { en: "/appointment", es: "/cita" },
    "/legal/privacy": { en: "/legal/privacy", es: "/legal/privacidad" },
    "/legal/terms": { en: "/legal/terms", es: "/legal/terminos" },
    "/legal/accessibility": { en: "/legal/accessibility", es: "/legal/accesibilidad" },
    "/legal/sms-terms": { en: "/legal/sms-terms", es: "/legal/terminos-sms" },
    "/legal/cookies": { en: "/legal/cookies", es: "/legal/cookies" },
  },
});
