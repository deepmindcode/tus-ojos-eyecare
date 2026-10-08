"use client";

import { ManzanitoFigure } from "./manzanito-figure";

/**
 * src/components/mascot/manzanito-view.tsx
 *
 * El aspecto de Manzanito, sin nada de decidir cuándo sale.
 *
 * Existe separado para que la previsualización del panel y lo que ve el
 * paciente sean LITERALMENTE el mismo componente. Mantener dos copias
 * parecidas termina siempre igual: dirección aprueba una cosa y en la
 * web se publica otra.
 */

export type Phase = "walking" | "talking" | "leaving";
export type Side = "left" | "right";

export function ManzanitoView({
  side,
  phase,
  alt,
  say,
  deal,
  cta,
  href,
  onClose,
  closeLabel,
  embedded = false,
}: {
  readonly side: Side;
  readonly phase: Phase;
  readonly alt: string;
  readonly say: string;
  readonly deal?: string | null;
  readonly cta: string;
  /** Sin href el botón no navega: así es en la previsualización. */
  readonly href?: string;
  readonly onClose: () => void;
  readonly closeLabel: string;
  /** Dentro de una tarjeta del panel en vez de pegado a la ventana. */
  readonly embedded?: boolean;
}) {
  return (
    <>
      <style>{MANZANITO_CSS}</style>
      <div
        className={`mz mz-${side} mz-${phase}${embedded ? " mz-embed" : ""}`}
        data-manzanito
        // No roba el foco ni interrumpe a un lector de pantalla: es una
        // invitación, no un aviso. Quien navegue con teclado llega al
        // botón en su turno.
        aria-live="off"
      >
        <div className="mz-bubble">
          <button type="button" className="mz-x" onClick={onClose} aria-label={closeLabel}>
            ✕
          </button>
          <p className="mz-say">{say}</p>
          {deal && <p className="mz-deal">{deal}</p>}
          {href ? (
            <a className="mz-cta" href={href}>
              {cta}
            </a>
          ) : (
            <span className="mz-cta" aria-hidden="true">
              {cta}
            </span>
          )}
        </div>
        <ManzanitoFigure title={alt} />
      </div>
    </>
  );
}

/**
 * El CSS viaja con el componente y no en globals.css porque sólo existe
 * cuando Manzanito está encendido: apagado, ni estas reglas ni el dibujo
 * llegan al navegador.
 */
export const MANZANITO_CSS = `
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

/* Dentro de una tarjeta del panel: se queda en su caja en vez de
   pegarse a la ventana del navegador. */
.mz-embed{position:absolute;bottom:10px;z-index:1}
`;
