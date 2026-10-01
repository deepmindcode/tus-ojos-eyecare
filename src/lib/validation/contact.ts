import { z } from "zod";

/**
 * src/lib/validation/contact.ts
 *
 * Mismo criterio que el formulario de cita: errores como CODIGOS, no
 * frases, para que el mismo esquema sirva en los dos idiomas. Y lo que
 * valida el navegador lo vuelve a validar el servidor, siempre.
 */

export const CONTACT_SUBJECTS = [
  "GENERAL",
  "INSURANCE",
  "APPOINTMENT_QUESTION",
  "GLASSES_REPAIR",
  "PRESCRIPTION_COPY",
  "OTHER",
] as const;

const nameField = z
  .string()
  .trim()
  .min(2, "required")
  .max(60, "tooLong")
  .regex(/^[\p{L}\p{M}' .-]+$/u, "invalidName");

export const contactSchema = z.object({
  name: nameField,
  email: z.string().trim().email("invalidEmail"),
  // El telefono es opcional: obligar a darlo espanta a quien solo quiere
  // preguntar algo por escrito.
  phone: z.union([z.literal(""), z.string().trim().min(7, "invalidPhone")]).optional(),

  /** Slug de la sede, vacio si la pregunta no es de una oficina concreta. */
  locationSlug: z.string().trim().max(60).optional(),

  subject: z.enum(CONTACT_SUBJECTS),

  // Limite duro, y la interfaz avisa de no escribir datos medicos. Un
  // campo corto desincentiva pegar un historial clinico entero.
  message: z.string().trim().min(10, "tooShort").max(2000, "tooLong"),

  locale: z.enum(["en", "es"]),

  /** Trampa para bots: una CASILLA, nunca un campo de texto (§18). */
  confirmSubscription: z.boolean().optional(),
  /** Momento de carga: un envio instantaneo no lo hace una persona. */
  startedAt: z.number().optional(),
  turnstileToken: z.string().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;