import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * src/lib/campaigns/token.ts
 *
 * Enlace de baja firmado.
 *
 * POR QUÉ FIRMADO Y NO UN ID: si el enlace fuera /unsubscribe?email=x,
 * cualquiera podría dar de baja a otro cambiando la dirección, o recorrer
 * la lista probando correos para averiguar quiénes son clientes. La firma
 * sólo la puede generar el servidor, así que el enlace funciona para el
 * que lo recibió y para nadie más.
 *
 * El enlace NO caduca a propósito. Una baja que deja de funcionar al mes
 * obliga a la persona a escribir para que la quiten, y eso es justo lo
 * que la ley quiere evitar.
 */

function secret(): string {
  // La clave de servicio nunca sale del servidor, así que sirve de
  // secreto. Si algún día se rota, los enlaces antiguos dejan de valer:
  // por eso se puede fijar uno propio y estable.
  const s = process.env.UNSUBSCRIBE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Falta UNSUBSCRIBE_SECRET o SUPABASE_SERVICE_ROLE_KEY");
  return s;
}

function sign(email: string): string {
  return createHmac("sha256", secret()).update(email.toLowerCase()).digest("base64url");
}

export function unsubscribeToken(email: string): string {
  const e = Buffer.from(email.toLowerCase(), "utf8").toString("base64url");
  return `${e}.${sign(email)}`;
}

/** Devuelve el correo si la firma cuadra, o null. */
export function readUnsubscribeToken(token: string): string | null {
  const [encoded, mac] = token.split(".");
  if (!encoded || !mac) return null;

  let email: string;
  try {
    email = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!email.includes("@")) return null;

  const expected = sign(email);
  // Comparación en tiempo constante: comparar con === filtra la firma
  // byte a byte por el tiempo que tarda en fallar.
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? email : null;
}
