import { z } from "zod";

/**
 * Esquema compartido entre cliente y servidor.
 *
 * El cliente lo usa para dar feedback inmediato; el servidor lo vuelve a
 * aplicar SIEMPRE. La validación de navegador es comodidad, no seguridad:
 * cualquiera puede enviar un POST directo saltándose el formulario.
 *
 * Los errores son CÓDIGOS, no frases. La traducción ocurre en la interfaz,
 * así el mismo esquema sirve para inglés y español.
 */

export const APPOINTMENT_REASONS = [
  "ROUTINE_EXAM",
  "CONTACT_LENS_EXAM",
  "EYEWEAR",
  "PEDIATRIC_EXAM",
  "DRY_EYE",
  "CORNEA_CONSULT",
  "KERATOCONUS",
  "GLAUCOMA_EVAL",
  "CATARACT_EVAL",
  "EYE_PROBLEM",
  "OTHER",
] as const;

export const COMMUNICATION_PREFERENCES = ["CALL", "TEXT", "EMAIL"] as const;
export const PATIENT_STATUS = ["new", "existing"] as const;
export const PREFERRED_TIMES = ["morning", "afternoon"] as const;

/** Versión del texto de consentimiento mostrado. Súbela si cambia el texto. */
export const CONSENT_VERSION = "2026-08-14.v1";

/**
 * Normaliza a E.164 de EE. UU. Acepta lo que la gente escribe de verdad:
 * "(856) 365-1500", "856-365-1500", "18563651500".
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

const phoneField = z
  .string()
  .trim()
  .min(1, "required")
  .refine((v) => normalizePhone(v) !== null, "invalidPhone");

const nameField = z
  .string()
  .trim()
  .min(2, "required")
  .max(60, "tooLong")
  // Sin dígitos ni símbolos raros: filtra la mayoría del spam automatizado
  // sin rechazar apellidos con acentos, apóstrofes o guiones.
  .regex(/^[\p{L}\p{M}' .-]+$/u, "invalidName");

export const appointmentSchema = z
  .object({
    locationId: z.string().trim().min(1, "required"),
    patientStatus: z.enum(PATIENT_STATUS),

    firstName: nameField,
    lastName: nameField,
    phone: phoneField,
    email: z.union([z.literal(""), z.string().trim().email("invalidEmail")]).optional(),

    preferredDate: z
      .string()
      .trim()
      .optional()
      .refine((v) => {
        if (!v) return true;
        const d = new Date(v + "T00:00:00");
        if (Number.isNaN(d.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Ni fechas pasadas ni a un año vista
        const max = new Date(today);
        max.setFullYear(max.getFullYear() + 1);
        return d >= today && d <= max;
      }, "invalidDate"),
    preferredTime: z.enum(PREFERRED_TIMES).optional(),

    reason: z.enum(APPOINTMENT_REASONS),

    // Límite duro. La UI además advierte de no incluir información médica:
    // un campo corto desincentiva pegar un historial clínico completo.
    notes: z.string().trim().max(500, "tooLong").optional(),

    communicationPreference: z.enum(COMMUNICATION_PREFERENCES),

    // Consentimientos SEPARADOS (TCPA). Ninguno viene premarcado.
    smsTransactionalConsent: z.boolean(),
    smsMarketingConsent: z.boolean(),

    locale: z.enum(["en", "es"]),

    /**
     * Trampa para bots: una CASILLA, no un campo de texto.
     *
     * La versión anterior era un input llamado "website" y Chrome lo
     * autocompletaba, bloqueando a personas reales sin mostrarles ningún
     * error. El autocompletado y los gestores de contraseñas nunca marcan
     * casillas, así que este falso positivo desaparece.
     *
     * No se valida aquí: la comprobación vive en el servidor, que puede
     * descartar en silencio sin avisar al bot de que lo detectó.
     */
    confirmSubscription: z.boolean().optional(),

    /**
     * Momento en que se cargó el formulario. Un envío en menos de dos
     * segundos y medio no lo hace una persona: son cinco pasos.
     */
    startedAt: z.number().optional(),

    /**
     * Slug de la promoción que trajo al visitante, si vino de un popup.
     * El texto del descuento NO viaja en el formulario: se resuelve en
     * el servidor contra la base. Editar la URL no crea un descuento.
     */
    promo: z
      .string()
      .trim()
      .max(80)
      .regex(/^[a-z0-9-]*$/, "invalidPromo")
      .optional(),

    turnstileToken: z.string().optional(),
  })
  .refine(
    // Si pide que le escriban por texto, el consentimiento SMS es obligatorio.
    (d) => d.communicationPreference !== "TEXT" || d.smsTransactionalConsent,
    { path: ["smsTransactionalConsent"], message: "smsConsentRequired" },
  )
  .refine(
    // Si pide correo, necesitamos un correo.
    (d) => d.communicationPreference !== "EMAIL" || (d.email ?? "").length > 0,
    { path: ["email"], message: "emailRequiredForPreference" },
  );

export type AppointmentInput = z.infer<typeof appointmentSchema>;
