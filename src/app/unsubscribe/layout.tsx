import type { Metadata } from "next";
import { Bricolage_Grotesque, Source_Sans_3 } from "next/font/google";
import "../globals.css";

/**
 * Baja de correos. Árbol propio, fuera del sitio y fuera del panel.
 *
 * Fuera del sitio porque las rutas públicas viven bajo /[locale] y este
 * enlace llega dentro de un correo, donde no sabemos qué idioma eligió
 * la persona: la página habla los dos.
 *
 * Fuera del panel porque no exige sesión, y debe funcionar incluso si
 * todo lo demás está caído. Una baja que falla es una queja.
 */

export const metadata: Metadata = {
  title: "Darse de baja",
  robots: { index: false, follow: false },
};

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export default function UnsubscribeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body className="bg-background">{children}</body>
    </html>
  );
}
