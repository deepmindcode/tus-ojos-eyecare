/**
 * Configuración centralizada del negocio.
 * FUENTE ÚNICA DE VERDAD: ninguna dirección, teléfono ni enlace de mapa
 * puede escribirse a mano en ninguna página. Las páginas legales, el
 * schema JSON-LD y el pie de página leen todo desde aquí (§45).
 */

export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export interface HoursBlock {
  readonly daysEN: string;
  readonly daysES: string;
  readonly time: string;
  /** Formato ISO para el schema openingHoursSpecification */
  readonly opens: string;
  readonly closes: string;
  readonly dayOfWeek: readonly string[];
}

/**
 * Una lista, no un único tramo: ninguna de las tres sedes abre igual toda
 * la semana, y un horario que no coincide con la puerta es peor que no
 * publicarlo, tanto para el paciente como para Google.
 */
export type LocationHours = readonly HoursBlock[];

export interface LocationConfig {
  readonly id: string;
  /** Slug en inglés: /locations/[slug] */
  readonly slug: string;
  /** Slug en español, independiente (§69): /es/ubicaciones/[slugES] */
  readonly slugES: string;
  readonly nameEN: string;
  readonly nameES: string;
  readonly addressLine1: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  /** Formato de visualización */
  readonly phone: string;
  /** Formato E.164 para href="tel:" y href="sms:" */
  readonly phoneE164: string;
  readonly smsE164: string;
  readonly googleMapsUrl: string;
  /** TODO: REQUIRES BUSINESS VERIFICATION — §78 prohíbe inventar coordenadas */
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly hours: LocationHours;
  /** Sede principal: coincide con el domicilio corporativo de Tus Ojos Inc. */
  readonly isPrincipal: boolean;
  readonly active: boolean;
}

const MON_THU = ["Monday", "Tuesday", "Wednesday", "Thursday"] as const;
const MON_FRI = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

const PHILADELPHIA_HOURS: LocationHours = [
  {
    daysEN: "Monday – Friday",
    daysES: "Lunes – Viernes",
    time: "9:00 AM – 5:00 PM",
    opens: "09:00",
    closes: "17:00",
    dayOfWeek: MON_FRI,
  },
  {
    daysEN: "Saturday",
    daysES: "Sábado",
    time: "9:00 AM – 1:00 PM",
    opens: "09:00",
    closes: "13:00",
    dayOfWeek: ["Saturday"],
  },
] as const;

const CAMDEN_HOURS: LocationHours = [
  {
    daysEN: "Monday – Thursday",
    daysES: "Lunes – Jueves",
    time: "9:00 AM – 5:00 PM",
    opens: "09:00",
    closes: "17:00",
    dayOfWeek: MON_THU,
  },
  {
    daysEN: "Friday",
    daysES: "Viernes",
    time: "8:00 AM – 4:00 PM",
    opens: "08:00",
    closes: "16:00",
    dayOfWeek: ["Friday"],
  },
  {
    daysEN: "Saturday",
    daysES: "Sábado",
    time: "8:00 AM – 12:00 PM",
    opens: "08:00",
    closes: "12:00",
    dayOfWeek: ["Saturday"],
  },
] as const;

const CHERRY_HILL_HOURS: LocationHours = [
  {
    daysEN: "Monday – Thursday",
    daysES: "Lunes – Jueves",
    time: "9:00 AM – 4:30 PM",
    opens: "09:00",
    closes: "16:30",
    dayOfWeek: MON_THU,
  },
  {
    daysEN: "Friday",
    daysES: "Viernes",
    time: "9:00 AM – 1:00 PM",
    opens: "09:00",
    closes: "13:00",
    dayOfWeek: ["Friday"],
  },
  {
    daysEN: "Saturday",
    daysES: "Sábado",
    time: "8:00 AM – 12:00 PM",
    opens: "08:00",
    closes: "12:00",
    dayOfWeek: ["Saturday"],
  },
] as const;

export const LOCATIONS: readonly LocationConfig[] = [
  {
    id: "camden-nj",
    slug: "camden-nj-eye-care",
    slugES: "cuidado-de-la-vista-camden-nj",
    nameEN: "Camden, New Jersey",
    nameES: "Camden, Nueva Jersey",
    addressLine1: "1000 Atlantic Ave.",
    city: "Camden",
    state: "NJ",
    postalCode: "08104",
    phone: "(856) 365-1500",
    phoneE164: "+18563651500",
    smsE164: "+18563651500",
    googleMapsUrl: "https://share.google/f5aDULOQBRecDOF0a",
    latitude: null,
    longitude: null,
    hours: CAMDEN_HOURS,
    isPrincipal: false,
    active: true,
  },
  {
    id: "philadelphia-pa",
    slug: "philadelphia-pa-eye-care",
    slugES: "cuidado-de-la-vista-philadelphia-pa",
    nameEN: "Philadelphia, Pennsylvania",
    nameES: "Philadelphia, Pensilvania",
    addressLine1: "412 W Lehigh Ave.",
    city: "Philadelphia",
    state: "PA",
    postalCode: "19133",
    phone: "(215) 634-6567",
    phoneE164: "+12156346567",
    smsE164: "+12156346567",
    googleMapsUrl: "https://share.google/HQmGm5uaUVDqm5DN9",
    latitude: null,
    longitude: null,
    hours: PHILADELPHIA_HOURS,
    isPrincipal: true,
    active: true,
  },
  {
    id: "cherry-hill-nj",
    slug: "cherry-hill-nj-eye-care",
    slugES: "cuidado-de-la-vista-cherry-hill-nj",
    nameEN: "Cherry Hill, New Jersey",
    nameES: "Cherry Hill, Nueva Jersey",
    addressLine1: "122 HaddonTowne Ct.",
    city: "Cherry Hill",
    state: "NJ",
    postalCode: "08034",
    phone: "(856) 375-2454",
    phoneE164: "+18563752454",
    smsE164: "+18563752454",
    googleMapsUrl: "https://share.google/DhV7ONVylLjLGyVsu",
    latitude: null,
    longitude: null,
    hours: CHERRY_HILL_HOURS,
    isPrincipal: false,
    active: true,
  },
] as const;

export function getLocation(id: string): LocationConfig | undefined {
  return LOCATIONS.find((l) => l.id === id);
}

export function getLocationBySlug(slug: string, locale: Locale): LocationConfig | undefined {
  return LOCATIONS.find((l) => (locale === "es" ? l.slugES : l.slug) === slug);
}

export const BRAND = {
  name: "Tus Ojos Eyecare",
  legalEntity: "Tus Ojos Inc.",
  foundedYear: 1996,
  /** Confirmado por el dueño (ago. 2026). El WordPress actual dice 135,000:
   *  unificar antes de publicar. */
  patientsServed: 120_000,
  email: "contact@tusojoseyecare.com",
  /**
   * DIRECCIÓN CORPORATIVA PRINCIPAL.
   *
   * Úsala donde la ley o el documento exijan UNA sola dirección física:
   * políticas legales, avisos corporativos, pie de correos comerciales
   * (CAN-SPAM exige dirección postal válida), y solicitudes de privacidad.
   *
   * Camden y Cherry Hill son ubicaciones operativas, NO domicilio
   * corporativo. Nunca las uses en un bloque de dirección principal.
   *
   * Toda plantilla de correo y documento legal lee de aquí. No dupliques
   * la dirección a mano en ningún sitio.
   */
  corporate: {
    legalEntity: "Tus Ojos Inc.",
    addressLine1: "412 W Lehigh Ave.",
    city: "Philadelphia",
    state: "PA",
    postalCode: "19133",
    country: "United States",
    phone: "(215) 634-6567",
    phoneE164: "+12156346567",
    email: "contact@tusojoseyecare.com",
    /** id de la ubicación operativa que coincide con la sede principal */
    locationId: "philadelphia-pa",
  },
  tagline: {
    es: "El servicio de calidad nunca pasa de moda",
    en: "Quality care never goes out of style",
  },
  social: {
    instagram: "https://www.instagram.com/tusojoseyecare_",
    facebook: "https://www.facebook.com/TusOjosInc",
    youtube: "https://www.youtube.com/@TusOjosEyeCare",
  },
} as const;

/** Bloque de dirección corporativa ya formateado, para documentos legales. */
export function corporateAddressBlock(): string {
  const c = BRAND.corporate;
  return [
    c.legalEntity,
    c.addressLine1,
    `${c.city}, ${c.state} ${c.postalCode}`,
    c.country,
  ].join("\n");
}

/** Colores del logotipo oficial. */
export const BRAND_COLORS = {
  /** Púrpura de la T — 9.4:1 sobre blanco */
  primary: "#800080",
  primaryDeep: "#6B006B",
  /** Teal de la elipse — 4.8:1 sobre blanco, pasa AA para texto normal */
  secondary: "#008080",
  /** Para texto sobre fondos tintados, donde el contraste efectivo baja */
  secondaryDeep: "#005F5F",
} as const;
