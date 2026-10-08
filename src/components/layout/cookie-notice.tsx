"use client";

import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * src/components/layout/cookie-notice.tsx
 *
 * Aviso de cookies honesto.
 *
 * Hoy el sitio solo usa lo imprescindible: la sesion del panel y el
 * antibot del formulario. No hay analitica ni pixeles de publicidad, y
 * por eso el aviso no finge ofrecer una eleccion que no existe para esas
 * dos cosas: informa, y guarda la decision para cuando se anada algo
 * opcional (un mapa incrustado, por ejemplo).
 *
 * La decision vive en `localStorage` y nunca sale del navegador. No se
 * envia a ningun sitio porque no hay nada que medir.
 */

const KEY = "tus-ojos-cookie-consent";

export type CookieChoice = "all" | "essential";

/**
 * Lo que debe consultar cualquier codigo que vaya a cargar algo opcional
 * (un mapa de Google, una analitica). Si devuelve false, no se carga.
 */
export function hasOptionalConsent(): boolean {
  try {
    return localStorage.getItem(KEY) === "all";
  } catch {
    return false;
  }
}

/** True cuando el visitante todavia no ha decidido. */
export function consentPending(): boolean {
  try {
    return localStorage.getItem(KEY) === null;
  } catch {
    // Sin almacenamiento no podemos recordar nada: no insistimos.
    return false;
  }
}

export function CookieNotice() {
  const locale = useLocale();
  const isES = locale === "es";
  const [visible, setVisible] = useState(false);

  // Se decide en el cliente: en el servidor no sabemos que guardo este
  // navegador, y renderizarlo siempre provocaria un salto de maquetado.
  useEffect(() => {
    setVisible(consentPending());
  }, []);

  function decide(choice: CookieChoice) {
    try {
      localStorage.setItem(KEY, choice);
    } catch {
      // Modo privado: la eleccion no se recuerda y el aviso volvera.
    }
    setVisible(false);
    // Avisa a quien este escuchando (el popup de promociones espera
    // a que esto se resuelva para no apilar dos tarjetas).
    window.dispatchEvent(new CustomEvent("tus-ojos-consent", { detail: choice }));
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      /* Manzanito y la ventana de promocion miran este atributo para no
         apilarse encima: en un movil no caben dos tarjetas, y el aviso
         de cookies es el que no se puede posponer. */
      data-cookie-notice
      aria-label={isES ? "Aviso de cookies" : "Cookie notice"}
      className="fixed bottom-20 left-4 z-[95] w-[min(400px,calc(100vw-2rem))] rounded-2xl border border-border-subtle bg-surface p-5 shadow-2xl lg:bottom-4"
    >
      <p className="inline-flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-brand-secondary-deep">
        <Cookie className="size-3.5" aria-hidden="true" />
        {isES ? "Cookies" : "Cookies"}
      </p>

      <p className="mt-2 text-[0.9rem] leading-relaxed text-text-secondary">
        {isES
          ? "Usamos lo imprescindible para que el sitio funcione: la sesión del personal y la protección del formulario. No usamos cookies de publicidad ni te seguimos por otros sitios."
          : "We use only what the site needs to work: staff sessions and form protection. We do not use advertising cookies and we do not track you across other sites."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => decide("all")}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-primary-deep"
        >
          {isES ? "Entendido" : "Got it"}
        </button>
        <button
          type="button"
          onClick={() => decide("essential")}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-border-subtle px-5 text-sm font-semibold hover:bg-background"
        >
          {isES ? "Solo lo esencial" : "Essential only"}
        </button>
      </div>

      <Link
        href="/legal/cookies"
        className="mt-3 inline-block text-xs font-semibold text-brand-primary underline decoration-brand-primary/40 underline-offset-2"
      >
        {isES ? "Leer la política de cookies" : "Read the cookie policy"}
      </Link>
    </div>
  );
}