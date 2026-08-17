import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de servidor con la sesión del usuario. Respeta RLS.
 * Úsalo en Server Components, Server Actions y route handlers cuando
 * la operación deba ejecutarse CON los permisos del usuario.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Los Server Components no pueden escribir cookies.
            // El refresco de sesión ocurre en middleware.ts, así que
            // ignorar esto es seguro.
          }
        },
      },
    },
  );
}

/**
 * Cliente administrativo que IGNORA RLS. Úsalo únicamente para:
 *   - insertar solicitudes de cita y mensajes de contacto tras validar
 *     Turnstile, honeypot y rate limit
 *   - escribir en audit_logs
 *   - leer credenciales de la tabla integrations
 *
 * REGLA: nunca lo llames con datos que vengan directo del usuario sin
 * validarlos primero con Zod. Aquí no hay red de seguridad de RLS.
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY no está definida");

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
