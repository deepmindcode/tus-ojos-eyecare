/**
 * Estructura de navegación. Las etiquetas son CLAVES de traducción, no
 * texto: el texto vive en messages/{en,es}.json.
 *
 * Los href son rutas internas de next-intl. El slug localizado lo
 * resuelve <Link> automáticamente: /services → /es/servicios.
 */

import type { routing } from "@/i18n/routing";

/**
 * Rutas ESTÁTICAS del sitio.
 *
 * Se excluyen las dinámicas —las que llevan [slug]— porque exigen pasar
 * el parámetro aparte y no pueden usarse como href suelto. Así
 * TypeScript rechaza en compilación tanto un enlace a una página que no
 * existe como un enlace a una ruta dinámica sin su parámetro.
 */
type AnyPathname = keyof typeof routing.pathnames;
export type AppPathname = Exclude<AnyPathname, `${string}[${string}`>;

export interface NavChild {
  readonly key: string;
  readonly href: AppPathname;
}

export interface NavGroup {
  readonly key: string;
  readonly children: readonly NavChild[];
}

export interface NavItem {
  readonly key: string;
  readonly href?: AppPathname;
  readonly groups?: readonly NavGroup[];
}

export const MAIN_NAV: readonly NavItem[] = [
  {
    key: "services",
    groups: [
      {
        key: "examsGroup",
        children: [
          { key: "comprehensiveExam", href: "/services" },
          { key: "childrensEyeCare", href: "/services" },
          { key: "diabeticExam", href: "/services" },
        ],
      },
      {
        key: "eyewearGroup",
        children: [
          { key: "glasses", href: "/services" },
          { key: "contactLenses", href: "/services" },
          { key: "specialtyLenses", href: "/services" },
        ],
      },
      {
        key: "conditionsGroup",
        children: [
          { key: "keratoconus", href: "/services" },
          { key: "dryEye", href: "/services" },
          { key: "glaucoma", href: "/services" },
          { key: "cataracts", href: "/services" },
        ],
      },
    ],
  },
  {
    key: "locations",
    groups: [
      {
        key: "allLocations",
        children: [
          { key: "camden", href: "/locations" },
          { key: "philadelphia", href: "/locations" },
          { key: "cherryHill", href: "/locations" },
        ],
      },
    ],
  },
  {
    key: "patients",
    groups: [
      {
        key: "patientsGroup",
        children: [
          { key: "firstVisit", href: "/patients/first-visit" },
          { key: "insurance", href: "/patients/insurance" },
          { key: "faq", href: "/patients/faq" },
        ],
      },
    ],
  },
  { key: "eyeHealth", href: "/eye-health" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
];

export const FOOTER_LEGAL: readonly NavChild[] = [
  { key: "privacy", href: "/legal/privacy" },
  { key: "terms", href: "/legal/terms" },
  { key: "accessibility", href: "/legal/accessibility" },
  { key: "smsTerms", href: "/legal/sms-terms" },
  { key: "cookies", href: "/legal/cookies" },
];

export const FOOTER_CARE: readonly NavChild[] = [
  { key: "comprehensiveExam", href: "/services" },
  { key: "childrensEyeCare", href: "/services" },
  { key: "contactLenses", href: "/services" },
  { key: "dryEye", href: "/services" },
  { key: "glasses", href: "/services" },
];

export const FOOTER_PATIENTS: readonly NavChild[] = [
  { key: "firstVisit", href: "/patients/first-visit" },
  { key: "faq", href: "/patients/faq" },
  { key: "appointment", href: "/appointment" },
  { key: "locations", href: "/locations" },
  { key: "contact", href: "/contact" },
];
