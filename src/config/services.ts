/**
 * Servicios destacados en la home. El catálogo completo vivirá en la
 * base de datos y se editará desde el panel (Fase 6); esto es la
 * selección fija de portada.
 *
 * `availability` distingue lo que se hace en consulta de lo que es sólo
 * evaluación o referimiento (§11). No prometemos procedimientos que no
 * se realizan en la oficina.
 */

import type { AppPathname } from "./navigation";

export type Availability = "in_office" | "evaluation" | "referral";

export interface ServicePreview {
  readonly key: string;
  readonly icon: "eye" | "glasses" | "baby" | "droplets" | "activity" | "sun";
  readonly availability: Availability;
  readonly href: AppPathname;
}

export const FEATURED_SERVICES: readonly ServicePreview[] = [
  { key: "comprehensiveExam", icon: "eye", availability: "in_office", href: "/services" },
  { key: "glasses", icon: "glasses", availability: "in_office", href: "/services" },
  { key: "contactLenses", icon: "sun", availability: "in_office", href: "/services" },
  { key: "childrensEyeCare", icon: "baby", availability: "in_office", href: "/services" },
  { key: "dryEye", icon: "droplets", availability: "evaluation", href: "/services" },
  { key: "keratoconus", icon: "activity", availability: "evaluation", href: "/services" },
];
