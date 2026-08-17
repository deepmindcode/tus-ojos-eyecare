import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

/**
 * Refresca la sesión de Supabase y escribe las cookies actualizadas en
 * la respuesta que ya generó next-intl.
 *
 * SameSite: usamos 'lax', no 'strict'. Con 'strict', el navegador NO
 * envía la cookie cuando el usuario llega desde otro sitio — incluido
 * el clic en un enlace mágico desde Gmail. Eso rompe el flujo PKCE:
 * la cookie con el code_verifier no viaja y el login falla siempre.
 * 'lax' bloquea igualmente los POST cross-site, que es lo que importa
 * para CSRF.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<{ response: NextResponse; user: User | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sin credenciales configuradas todavía no hay sesión que refrescar.
  // El sitio público debe renderizarse igual: Supabase es necesario para
  // el panel y los formularios, no para que se vea la home. Si faltan,
  // /admin simplemente no tendrá usuario y el middleware lo mandará al
  // login, que es exactamente el comportamiento correcto.
  const placeholder = !url || url.includes("xxxx") || url.includes("placeholder");
  if (placeholder || !key) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[supabase] Faltan NEXT_PUBLIC_SUPABASE_URL / ANON_KEY en .env.local. " +
          "El sitio público funciona; el panel y los formularios no.",
      );
    }
    return { response, user: null };
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          });
        });
      },
    },
  });

  // getUser() valida el JWT contra el servidor de Supabase.
  // NUNCA uses getSession() para decidir permisos: lee la cookie sin
  // verificar la firma, así que un atacante podría fabricarla.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
