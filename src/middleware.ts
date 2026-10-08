import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ------------------------------------------------------------------
  // /admin — no está localizado y no pasa por next-intl.
  //
  // IMPORTANTE: esto es una PUERTA BARATA, no la autorización real.
  // Sólo comprueba que exista una sesión válida y redirige si no la hay.
  // La verificación de rol (RBAC) vive en el layout del servidor y en
  // las políticas RLS. Confiar únicamente en el middleware para
  // autorizar fue exactamente el vector de CVE-2025-29927 en Next.js:
  // una cabecera manipulada permitía saltárselo por completo.
  // ------------------------------------------------------------------
  if (pathname.startsWith("/admin")) {
    const response = NextResponse.next({ request });
    const { user } = await updateSession(request, response);

    const isLoginPage = pathname === "/admin/login";

    if (!user && !isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      // Sin parámetro de retorno con datos: evita filtrar rutas internas
      // por el historial o el Referer.
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (user && isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

    return response;
  }

  // ------------------------------------------------------------------
  // Sitio público: sólo next-intl resuelve el locale y la ruta
  // localizada. Nada más.
  //
  // Aquí ya NO se refresca la sesión. Antes se hacía, y costaba dos
  // cosas en cada visita de cada persona: construir un cliente de
  // autenticación que nadie iba a usar —ninguna página pública lee el
  // usuario—, y, a quien tuviera sesión abierta, devolverle una cookie
  // nueva, lo que impide que la CDN guarde esa respuesta y la reutilice.
  //
  // La sesión del equipo se sigue refrescando donde importa: cada
  // visita a /admin pasa por la rama de arriba.
  // ------------------------------------------------------------------
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Todo salvo estáticos, imágenes optimizadas y archivos con extensión.
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
    "/admin/:path*",
  ],
};
