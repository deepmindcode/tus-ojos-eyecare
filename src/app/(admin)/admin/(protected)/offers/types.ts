/**
 * src/app/(admin)/admin/(protected)/offers/types.ts
 *
 * Los tipos viven aqui y no en `actions.ts` porque un modulo marcado
 * "use server" solo debe exportar funciones async, y el editor (que es
 * un componente de cliente) necesita estas formas.
 */

export type PromotionStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "ACTIVE"
  | "PAUSED"
  | "EXPIRED"
  | "ARCHIVED";

export interface PromotionRow {
  readonly id: string;
  readonly slug: string | null;
  readonly internalName: string;
  readonly titleEn: string;
  readonly titleEs: string;
  readonly descriptionEn: string | null;
  readonly descriptionEs: string | null;
  readonly discountLabelEn: string | null;
  readonly discountLabelEs: string | null;
  readonly termsEn: string | null;
  readonly termsEs: string | null;
  readonly ctaLabelEn: string | null;
  readonly ctaLabelEs: string | null;
  readonly exclusiveLocationSlug: string | null;
  readonly displayType: string;
  readonly delaySeconds: number;
  readonly frequency: string;
  readonly startAt: string | null;
  readonly endAt: string | null;
  readonly status: PromotionStatus;
  /** Si sale como ventana emergente en el sitio. */
  readonly showPopup: boolean;
  /** Si puede elegirse como descuento de una campana de correo. */
  readonly allowCampaign: boolean;
  readonly isDemo: boolean;
  readonly impressions: number;
  readonly ctaClicks: number;
  readonly appointments: number;
}

export interface PromotionInput {
  id?: string;
  internalName: string;
  slug: string;
  titleEn: string;
  titleEs: string;
  descriptionEn: string;
  descriptionEs: string;
  discountLabelEn: string;
  discountLabelEs: string;
  termsEn: string;
  termsEs: string;
  ctaLabelEn: string;
  ctaLabelEs: string;
  /** Vacío = las tres sedes */
  exclusiveLocationSlug: string;
  displayType: string;
  delaySeconds: number;
  frequency: string;
  showPopup: boolean;
  allowCampaign: boolean;
  startAt: string;
  endAt: string;
}
/**
 * Cada cuánto vuelve a salirle Manzanito a la misma persona.
 *
 * Vive aquí y no en `actions.ts` porque aquel archivo es "use server" y
 * ahí sólo se pueden exportar funciones: exportar esta lista desde allí
 * rompía la compilación de la página entera.
 */
export const MASCOT_FREQUENCIES = ["daily", "weekly", "session", "always"] as const;
export type MascotFrequency = (typeof MASCOT_FREQUENCIES)[number];

/** Por qué lado entra Manzanito. "random" alterna solo. */
export const MASCOT_SIDES = ["random", "left", "right"] as const;
export type MascotSide = (typeof MASCOT_SIDES)[number];
