import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de navegador. SÓLO usa la anon key.
 * Nunca importes SUPABASE_SERVICE_ROLE_KEY en un archivo que pueda
 * terminar en el bundle del cliente.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
