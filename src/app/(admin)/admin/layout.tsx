import type { Metadata } from "next";
import { Bricolage_Grotesque, Source_Sans_3 } from "next/font/google";
import "../../globals.css";

/**
 * Layout raíz del PANEL. Árbol separado del sitio público: no se traduce
 * y no comparte navegación ni promociones (§98).
 *
 * Aquí NO hay comprobación de rol a propósito: /admin/login tiene que ser
 * accesible sin sesión. La autorización real vive en el layout del
 * subárbol (protected).
 */

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

export const metadata: Metadata = {
  title: "Tus Ojos Admin",
  // El panel nunca se indexa, aunque alguien filtre la URL.
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
