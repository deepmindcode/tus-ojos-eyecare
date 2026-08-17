/**
 * Limitación de peticiones para formularios públicos.
 *
 * En producción usa Upstash Redis, que es compartido entre las instancias
 * serverless de Vercel. El respaldo en memoria SÓLO sirve en desarrollo:
 * cada instancia tendría su propio contador y un atacante sólo tendría
 * que repartir las peticiones para saltárselo.
 */

interface RateLimitResult {
  readonly success: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = memory.get(key);

  if (!entry || entry.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  const ok = entry.count <= limit;
  return {
    success: ok,
    remaining: Math.max(0, limit - entry.count),
    retryAfterSeconds: ok ? 0 : Math.ceil((entry.resetAt - now) / 1000),
  };
}

export async function rateLimit(
  identifier: string,
  { limit = 5, windowSeconds = 3600 } = {},
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      // En producción, sin Redis no hay límite fiable. Es preferible
      // registrar el fallo a fingir que estamos protegidos.
      console.error("[rate-limit] Upstash no configurado en producción");
    }
    return memoryLimit(identifier, limit, windowSeconds * 1000);
  }

  try {
    // INCR + EXPIRE en una sola ida y vuelta
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", identifier],
        ["EXPIRE", identifier, String(windowSeconds), "NX"],
        ["TTL", identifier],
      ]),
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    const data = (await res.json()) as { result: number }[];
    const count = Number(data[0]?.result ?? 0);
    const ttl = Number(data[2]?.result ?? windowSeconds);

    return {
      success: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: count <= limit ? 0 : Math.max(1, ttl),
    };
  } catch (err) {
    console.error("[rate-limit] fallo consultando Upstash:", err);
    // Si Redis cae, no bloqueamos el formulario: un paciente que no puede
    // pedir cita es peor que un bot que pasa. El honeypot y Turnstile siguen.
    return { success: true, remaining: 0, retryAfterSeconds: 0 };
  }
}

/**
 * Verifica Cloudflare Turnstile. Si no hay clave configurada, deja pasar
 * y avisa: así el formulario funciona en desarrollo sin cuenta de Cloudflare.
 */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[turnstile] TURNSTILE_SECRET_KEY no configurada en producción");
    }
    return true;
  }
  if (!token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
      cache: "no-store",
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] fallo verificando:", err);
    return false;
  }
}
