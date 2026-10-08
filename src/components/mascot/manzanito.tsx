"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { ManzanitoView, type Phase, type Side } from "./manzanito-view";

/**
 * src/components/mascot/manzanito.tsx
 *
 * Manzanito: sale caminando por un lado al azar e invita a pedir cita.
 * Si hay una oferta activa para esa página, la anuncia él.
 *
 * Lo que manda aquí, y por qué:
 *
 *   - Lo enciende y lo apaga dirección desde el panel. Mientras esté
 *     apagado este componente no pinta nada y no hay nada que cargar.
 *   - Habla en el idioma de la página. Sale de `useLocale()`, no de un
 *     ajuste aparte: si la persona está leyendo en inglés, Manzanito no
 *     puede saludarla en español.
 *   - Reaparece una vez al día por visitante, y si lo cierra, ese día no
 *     vuelve. La memoria es del navegador, nunca del servidor: que
 *     alguien haya visto una mascota no es un dato que haya que guardar.
 *   - Nunca en las legales, ni en el formulario de cita —quien ya está
 *     pidiendo cita no necesita que le inviten—, ni en el panel.
 *   - Espera si el aviso de cookies está en pantalla. En un móvil no
 *     caben dos tarjetas, y la de cookies tiene prioridad legal.
 *   - Con «reducir movimiento» activado aparece sin caminar. El paseo es
 *     adorno; el mensaje es lo que importa.
 */

interface Promo {
  readonly id: string;
  readonly slug: string;
  readonly discount_label: string | null;
  readonly delay_seconds: number;
}

const SEEN_KEY = "tusojos_manzanito_seen";
const DAY = 86_400_000;

/**
 * Cada cuánto vuelve a salirle a la misma persona. Lo elige dirección
 * desde el panel.
 *
 *   daily   — una vez cada 24 horas (lo sensato, y lo de fábrica)
 *   weekly  — una vez por semana
 *   session — una vez por visita: si cierra el navegador y vuelve, sale
 *   always  — cada página. Está porque se pidió; molesta.
 *
 * La memoria vive SIEMPRE en el navegador de cada persona, nunca en la
 * base: que alguien haya visto una mascota no es un dato de nadie.
 */
export type Frequency = "daily" | "weekly" | "session" | "always";

/** `session` usa sessionStorage, que el navegador borra al cerrarse. */
function store(freq: Frequency): Storage | null {
  try {
    return freq === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

const COPY = {
  es: {
    alt: "Manzanito, la mascota de Tus Ojos Eyecare",
    hello: "¡Hola! Soy Manzanito. ¿Hace cuánto que no te revisas la vista?",
    offer: "¡Hola! Soy Manzanito y traigo una oferta para ti:",
    cta: "Pedir cita",
    close: "Cerrar",
  },
  en: {
    alt: "Manzanito, the Tus Ojos Eyecare mascot",
    hello: "Hi! I'm Manzanito. When did you last get your eyes checked?",
    offer: "Hi! I'm Manzanito, and I have an offer for you:",
    cta: "Book an appointment",
    close: "Close",
  },
} as const;

/** Rutas donde no sale, pase lo que pase. */
function barred(path: string): boolean {
  return (
    path.includes("/legal") ||
    path.includes("/appointment") ||
    path.includes("/cita") ||
    path.startsWith("/admin") ||
    path.startsWith("/unsubscribe")
  );
}

function alreadySeen(freq: Frequency): boolean {
  if (freq === "always") return false;
  try {
    const raw = store(freq)?.getItem(SEEN_KEY);
    if (raw === null || raw === undefined) return false;
    if (freq === "session") return true;
    return Date.now() - Number(raw) < (freq === "weekly" ? 7 * DAY : DAY);
  } catch {
    // Navegación privada o almacenamiento bloqueado: se trata como no
    // visto. Preferible que salga de más a que no salga nunca.
    return false;
  }
}

function markSeen(freq: Frequency) {
  if (freq === "always") return;
  try {
    store(freq)?.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    /* sin memoria, saldrá otra vez; no es un error que mostrar */
  }
}

export function Manzanito() {
  const locale = useLocale() === "es" ? "es" : "en";
  const pathname = usePathname();
  const t = COPY[locale];

  const [promo, setPromo] = useState<Promo | null>(null);
  const [side, setSide] = useState<Side>("left");
  const [phase, setPhase] = useState<"off" | Phase>("off");

  useEffect(() => {
    if (barred(pathname)) return;

    let dead = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    async function start() {
      // La comprobación de "ya lo vio" va DESPUÉS de preguntar, y no
      // antes, porque es el servidor quien dice cada cuánto debe salir.
      // La respuesta está en caché de CDN, así que preguntar es barato.
      let payload: {
        manzanito?: boolean;
        promo?: Promo | null;
        frequency?: Frequency;
        side?: "left" | "right" | "random";
      };
      try {
        const res = await fetch(
          `/api/promotion?path=${encodeURIComponent(pathname)}&locale=${locale}`,
        );
        if (!res.ok) return;
        payload = await res.json();
      } catch {
        return;
      }

      const freq: Frequency = payload.frequency ?? "daily";
      if (dead || !payload.manzanito || alreadySeen(freq)) return;

      // El aviso de cookies tiene prioridad: se espera a que se decida.
      const wait = document.querySelector("[data-cookie-notice]") ? 6000 : 2500;

      timers.push(
        setTimeout(() => {
          if (dead || document.querySelector("[data-cookie-notice]")) return;
          setPromo(payload.promo ?? null);
          // El lado lo decide dirección; "random" es el de fábrica.
          const want = payload.side;
          setSide(want === "left" || want === "right" ? want : Math.random() < 0.5 ? "left" : "right");

          const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          if (calm) {
            setPhase("talking");
          } else {
            setPhase("walking");
            timers.push(setTimeout(() => !dead && setPhase("talking"), 2100));
          }
          markSeen(freq);
        }, wait),
      );
    }

    void start();
    return () => {
      dead = true;
      timers.forEach(clearTimeout);
    };
  }, [pathname, locale]);

  if (phase === "off") return null;

  const href = promo
    ? `/${locale === "es" ? "es/cita" : "appointment"}?promo=${promo.slug}`
    : `/${locale === "es" ? "es/cita" : "appointment"}`;

  function dismiss() {
    setPhase("leaving");
    setTimeout(() => setPhase("off"), 320);
  }

  return (
    <ManzanitoView
      side={side}
      phase={phase}
      alt={t.alt}
      say={promo ? t.offer : t.hello}
      deal={promo?.discount_label ?? null}
      cta={t.cta}
      href={href}
      onClose={dismiss}
      closeLabel={t.close}
    />
  );
}
