"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { ManzanitoFigure } from "./manzanito-figure";

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
  const [side, setSide] = useState<"left" | "right">("left");
  const [phase, setPhase] = useState<"off" | "walking" | "talking" | "leaving">("off");

  useEffect(() => {
    if (barred(pathname)) return;

    let dead = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    async function start() {
      // La comprobación de "ya lo vio" va DESPUÉS de preguntar, y no
      // antes, porque es el servidor quien dice cada cuánto debe salir.
      // La respuesta está en caché de CDN, así que preguntar es barato.
      let payload: { manzanito?: boolean; promo?: Promo | null; frequency?: Frequency };
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
          setSide(Math.random() < 0.5 ? "left" : "right");

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
    <>
      <style>{CSS}</style>
      <div
        className={`mz mz-${side} mz-${phase}`}
        data-manzanito
        // No roba el foco ni interrumpe a un lector de pantalla: es una
        // invitación, no un aviso. Quien navegue con teclado llega al
        // botón en su turno.
        aria-live="off"
      >
        <div className="mz-bubble">
          <button type="button" className="mz-x" onClick={dismiss} aria-label={t.close}>
            ✕
          </button>
          <p className="mz-say">{promo ? t.offer : t.hello}</p>
          {promo?.discount_label && <p className="mz-deal">{promo.discount_label}</p>}
          <a className="mz-cta" href={href}>
            {t.cta}
          </a>
        </div>
        <ManzanitoFigure title={t.alt} />
      </div>
    </>
  );
}

/**
 * El CSS va aquí dentro y no en globals.css porque sólo existe cuando
 * Manzanito está encendido: apagado, ni estas reglas ni el dibujo llegan
 * al navegador.
 */
const CSS = `
.mz{position:fixed;bottom:16px;z-index:60;width:132px;pointer-events:none}
.mz-bubble,.mz-toon{pointer-events:auto}

/* --- entrada: se acerca andando y frena con un pequeno rebote --- */
.mz-left{left:16px;transform:translateX(-300px)}
.mz-right{right:16px;transform:translateX(300px)}
.mz-walking,.mz-talking{transform:translateX(0);
 transition:transform 2.2s cubic-bezier(.26,.04,.3,1.14)}
.mz-leaving{opacity:0;transform:translateY(14px);transition:opacity .32s ease,transform .32s ease}

.mz-toon{display:block;width:100%;height:auto;overflow:visible;
 transform-box:view-box;transform-origin:60px 132px;
 filter:drop-shadow(0 7px 11px rgb(0 0 0/.2))}

/* --- caminando --- */
.mz-walking .mz-toon{animation:mzbob .38s ease-in-out infinite}
@keyframes mzbob{0%,100%{transform:translateY(0) rotate(-1.4deg)}50%{transform:translateY(-5px) rotate(1.4deg)}}
.mz-leg{transform-box:view-box;transform-origin:50px 106px}
.mz-leg.mz-r{transform-origin:71px 106px}
.mz-walking .mz-leg{animation:mzstep .38s ease-in-out infinite}
.mz-walking .mz-leg.mz-r{animation-delay:-.19s}
@keyframes mzstep{0%,100%{transform:rotate(17deg)}50%{transform:rotate(-17deg)}}
.mz-arm{transform-box:view-box;transform-origin:30px 76px}
.mz-arm.mz-r{transform-origin:90px 76px}
.mz-walking .mz-arm{animation:mzswing .38s ease-in-out infinite}
.mz-walking .mz-arm.mz-r{animation-delay:-.19s}
@keyframes mzswing{0%,100%{transform:rotate(-13deg)}50%{transform:rotate(13deg)}}

/* --- invitando: dos saltitos, descanso, y vuelta --- */
.mz-talking .mz-toon{animation:mzhop 4.2s ease-in-out .35s infinite}
@keyframes mzhop{
 0%{transform:translateY(0) scale(1,1)}
 5%{transform:translateY(0) scale(1.07,.93)}
 13%{transform:translateY(-13px) scale(.95,1.06)}
 20%{transform:translateY(0) scale(1.08,.92)}
 25%{transform:translateY(0) scale(1,1)}
 30%{transform:translateY(0) scale(1.05,.95)}
 37%{transform:translateY(-9px) scale(.97,1.04)}
 43%{transform:translateY(0) scale(1.05,.95)}
 48%,100%{transform:translateY(0) scale(1,1)}}

/* Los bracitos suben y se quedan arriba, agitandose en cada salto.
   Los cien grados no son decorativos: con el brazo apuntando abajo y
   hacia fuera, es el giro que deja la mano por encima del hombro. */
.mz-talking .mz-arm.mz-l{animation:mzupL 4.2s ease-in-out .35s infinite}
.mz-talking .mz-arm.mz-r{animation:mzupR 4.2s ease-in-out .35s infinite}
@keyframes mzupL{
 0%{transform:rotate(0)}8%{transform:rotate(104deg)}
 13%{transform:rotate(92deg)}20%{transform:rotate(104deg)}
 37%{transform:rotate(92deg)}43%{transform:rotate(104deg)}
 92%{transform:rotate(100deg)}100%{transform:rotate(0)}}
@keyframes mzupR{
 0%{transform:rotate(0)}8%{transform:rotate(-104deg)}
 13%{transform:rotate(-92deg)}20%{transform:rotate(-104deg)}
 37%{transform:rotate(-92deg)}43%{transform:rotate(-104deg)}
 92%{transform:rotate(-100deg)}100%{transform:rotate(0)}}

/* --- parpadeo: siempre, tambien mientras camina --- */
.mz-lid{transform-box:view-box;transform-origin:60px 2px;transform:scaleY(0);
 animation:mzblink 5.6s ease-in-out infinite}
@keyframes mzblink{0%,88%,100%{transform:scaleY(0)}91%{transform:scaleY(1)}94%{transform:scaleY(0)}
 96%{transform:scaleY(1)}98%{transform:scaleY(0)}}

/* --- bocadillo --- */
.mz-bubble{position:absolute;bottom:calc(100% - 10px);width:238px;max-width:calc(100vw - 48px);
 background:var(--color-surface,#fff);color:var(--color-text-primary,#1d2422);
 border:2px solid var(--color-brand-primary,#800080);border-radius:16px;padding:13px 14px 14px;
 box-shadow:0 12px 30px rgb(0 0 0/.16);opacity:0;transform:scale(.84) translateY(8px);
 transition:opacity .22s ease,transform .3s cubic-bezier(.2,1.5,.5,1)}
.mz-left .mz-bubble{left:0;transform-origin:bottom left}
.mz-right .mz-bubble{right:0;transform-origin:bottom right}
.mz-talking .mz-bubble{opacity:1;transform:scale(1) translateY(0)}
.mz-bubble::after{content:"";position:absolute;top:100%;width:14px;height:14px;
 background:var(--color-surface,#fff);border-right:2px solid var(--color-brand-primary,#800080);
 border-bottom:2px solid var(--color-brand-primary,#800080);transform:translateY(-8px) rotate(45deg)}
.mz-left .mz-bubble::after{left:38px}
.mz-right .mz-bubble::after{right:38px}
.mz-say{margin:0 14px 9px 0;font-size:.92rem;line-height:1.4}
.mz-deal{margin:0 0 10px;font-weight:800;font-size:.95rem;color:var(--color-brand-secondary-deep,#005f5f);
 background:var(--color-brand-secondary-tint,#e3f0f0);border-radius:9px;padding:7px 9px}
.mz-cta{display:flex;align-items:center;justify-content:center;min-height:42px;
 background:var(--color-brand-primary,#800080);color:#fff;border-radius:999px;
 font-weight:700;font-size:.9rem;text-decoration:none}
.mz-cta:hover{background:var(--color-brand-primary-deep,#6b006b)}
.mz-x{position:absolute;top:4px;right:4px;width:30px;height:30px;display:grid;place-items:center;
 background:none;border:0;border-radius:50%;color:var(--color-text-secondary,#55605d);
 font-size:15px;line-height:1;cursor:pointer}
.mz-x:hover{background:var(--color-brand-primary-tint,#f6e8f6);color:var(--color-brand-primary,#800080)}
@media (max-width:640px){.mz{width:104px;bottom:88px}.mz-bubble{width:212px}}

/* Quien pide menos movimiento no ve ni paseo ni saltos. El parpadeo
   tambien se para: es pequeno, pero es movimiento repetido. */
@media (prefers-reduced-motion:reduce){
 .mz-walking,.mz-talking{transition:none}
 .mz-toon,.mz-leg,.mz-arm,.mz-lid{animation:none!important}
 .mz-talking .mz-arm.mz-l{transform:rotate(100deg)}
 .mz-talking .mz-arm.mz-r{transform:rotate(-100deg)}
}
`;
