"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { ManzanitoView, type Phase, type Side } from "@/components/mascot/manzanito-view";
import type { MascotSide } from "@/app/(admin)/admin/(protected)/offers/types";

/**
 * src/components/admin/mascot-preview.tsx
 *
 * Ver a Manzanito sin salir del panel.
 *
 * Usa `ManzanitoView`, el MISMO componente que ve el paciente, no una
 * copia parecida. Una previsualización que se parece pero no es lo
 * mismo acaba enseñando una cosa y publicando otra.
 *
 * Lo que se elige aquí dentro —idioma, con o sin oferta— es sólo para
 * mirar: no cambia nada en la web. El idioma de verdad lo decide la
 * página que esté leyendo el paciente, y la oferta, si hay alguna
 * activa. El lado sí sale del ajuste de arriba, para que al cambiarlo
 * se vea el efecto.
 */

const COPY = {
  es: {
    alt: "Manzanito, la mascota de Tus Ojos Eyecare",
    hello: "¡Hola! Soy Manzanito. ¿Hace cuánto que no te revisas la vista?",
    offer: "¡Hola! Soy Manzanito y traigo una oferta para ti:",
    deal: "20% de descuento en examen de la vista",
    cta: "Pedir cita",
    close: "Cerrar",
  },
  en: {
    alt: "Manzanito, the Tus Ojos Eyecare mascot",
    hello: "Hi! I'm Manzanito. When did you last get your eyes checked?",
    offer: "Hi! I'm Manzanito, and I have an offer for you:",
    deal: "20% off your eye exam",
    cta: "Book an appointment",
    close: "Close",
  },
} as const;

export function MascotPreview({ side }: { readonly side: MascotSide }) {
  const [lang, setLang] = useState<"es" | "en">("es");
  const [withDeal, setWithDeal] = useState(false);
  const [shown, setShown] = useState<Side>("left");
  const [phase, setPhase] = useState<"off" | Phase>("off");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const play = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("off");

    timers.current.push(
      setTimeout(() => {
        setShown(side === "random" ? (Math.random() < 0.5 ? "left" : "right") : side);
        setPhase("walking");
        timers.current.push(setTimeout(() => setPhase("talking"), 2150));
      }, 60),
    );
  }, [side]);

  // Se lanza solo al abrir la pantalla y cada vez que cambia el lado
  // elegido arriba: así se ve el efecto del ajuste sin buscar el botón.
  useEffect(() => {
    // El arranque va en un temporizador y no suelto en el efecto: así el
    // primer cambio de estado ocurre en una devolución de llamada, que es
    // lo que evita el renderizado en cascada al montar.
    const kick = setTimeout(play, 0);
    const t = timers.current;
    return () => {
      clearTimeout(kick);
      t.forEach(clearTimeout);
    };
  }, [play]);

  const t = COPY[lang];

  return (
    <div className="mt-4">
      <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
        Así se ve
      </p>

      <div className="relative mt-1.5 h-72 overflow-hidden rounded-xl border border-border-subtle bg-background">
        {phase !== "off" && (
          <ManzanitoView
            embedded
            side={shown}
            phase={phase}
            alt={t.alt}
            say={withDeal ? t.offer : t.hello}
            deal={withDeal ? t.deal : null}
            cta={t.cta}
            onClose={() => setPhase("off")}
            closeLabel={t.close}
          />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={play}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-brand-primary px-4 text-sm font-bold text-white hover:bg-brand-primary-deep"
        >
          <Play className="size-3.5" aria-hidden="true" />
          Ver cómo sale
        </button>

        <Toggle
          options={[
            { value: "es", label: "Español" },
            { value: "en", label: "English" },
          ]}
          value={lang}
          onChange={(v) => setLang(v as "es" | "en")}
        />
        <Toggle
          options={[
            { value: "no", label: "Sin oferta" },
            { value: "yes", label: "Con oferta" },
          ]}
          value={withDeal ? "yes" : "no"}
          onChange={(v) => setWithDeal(v === "yes")}
        />
      </div>

      <p className="mt-1.5 text-xs text-text-secondary">
        El idioma y la oferta de aquí son sólo para mirar. En la web, el idioma
        lo decide la página que esté leyendo el paciente, y la oferta aparece
        sola si tienes una activa marcada para la web.
      </p>
    </div>
  );
}

function Toggle({
  options,
  value,
  onChange,
}: {
  readonly options: readonly { value: string; label: string }[];
  readonly value: string;
  readonly onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-full border-2 border-border-subtle p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={`min-h-9 rounded-full px-3.5 text-sm font-bold ${
            o.value === value
              ? "bg-brand-secondary text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
