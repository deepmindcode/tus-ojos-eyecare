"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  setManzanito,
  setManzanitoFrequency,
} from "@/app/(admin)/admin/(protected)/offers/actions";
import type { MascotFrequency } from "@/app/(admin)/admin/(protected)/offers/types";

/**
 * src/components/admin/mascot-switch.tsx
 *
 * Encender y apagar a Manzanito.
 *
 * Vive en Offers y no en una pantalla aparte porque es ahí donde se
 * decide qué se le ofrece a quien entra, y porque Manzanito es quien
 * anuncia las ofertas: tenerlo a la vista mientras se crea una promoción
 * es justo cuando hace falta recordar que existe.
 */
/**
 * Las cuatro frecuencias, con el nombre que entiende quien las elige y
 * una linea de que significan. «Siempre» lleva aviso: esta porque se
 * pidio, no porque convenga.
 */
const FREQS: readonly {
  value: MascotFrequency;
  label: string;
  help: string;
  warn?: boolean;
}[] = [
  { value: "daily", label: "Una vez al día", help: "Recomendado. No vuelve a salirle a esa persona hasta mañana." },
  { value: "weekly", label: "Una vez por semana", help: "Más discreto. Para cuando la oferta no corre prisa." },
  { value: "session", label: "Una vez por visita", help: "Vuelve a salir si cierra el navegador y entra más tarde." },
  {
    value: "always",
    label: "En cada página",
    help: "No recomendado: un muñeco que salta encima del texto en cada página echa gente del sitio, y Google penaliza lo que tapa contenido en el móvil.",
    warn: true,
  },
];

export function MascotSwitch({
  initial,
  initialFrequency,
}: {
  readonly initial: boolean;
  readonly initialFrequency: MascotFrequency;
}) {
  const [on, setOn] = useState(initial);
  const [freq, setFreq] = useState<MascotFrequency>(initialFrequency);
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function changeFreq(value: MascotFrequency) {
    const before = freq;
    setFreq(value);
    start(async () => {
      const r = await setManzanitoFrequency(value);
      setNote(
        r.ok
          ? "Guardado. Tarda hasta un minuto en aplicarse."
          : "No se pudo guardar la frecuencia.",
      );
      if (!r.ok) setFreq(before);
    });
  }

  function toggle() {
    const next = !on;
    start(async () => {
      const r = await setManzanito(next);
      if (r.ok) {
        setOn(next);
        setNote(
          next
            ? "Manzanito está en el sitio. Tarda hasta un minuto en aparecer para todos."
            : "Manzanito apagado. La ventana de promoción vuelve a encargarse de las ofertas.",
        );
      } else {
        setNote("No se pudo cambiar. Inténtalo otra vez.");
      }
    });
  }

  return (
    <section
      className={`mb-6 rounded-2xl border-2 p-5 ${
        on ? "border-brand-secondary bg-brand-secondary-tint" : "border-border-subtle bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        {on ? (
          <Eye className="mt-0.5 size-5 shrink-0 text-brand-secondary-deep" aria-hidden="true" />
        ) : (
          <EyeOff className="mt-0.5 size-5 shrink-0 text-text-secondary" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-extrabold">
            Manzanito {on ? "está encendido" : "está apagado"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">
            La mascota sale caminando por un lado de la web, saluda e invita a
            pedir cita. Habla en el idioma de la página. Si hay una oferta activa,
            es Manzanito quien la anuncia — y entonces la ventana de promoción no
            sale, para no apilar dos tarjetas en un teléfono.
          </p>
          <p className="mt-1.5 text-sm text-text-secondary">
            Sale una vez al día por visitante. Nunca en las páginas legales ni en
            el formulario de cita.
          </p>

          {/* La frecuencia se puede ajustar aunque este apagado: asi se
              deja elegida antes de encenderlo. */}
          <div className="mt-4">
            <label
              htmlFor="mz-freq"
              className="text-xs font-bold uppercase tracking-wider text-text-secondary"
            >
              Cada cuánto le sale a la misma persona
            </label>
            <select
              id="mz-freq"
              value={freq}
              disabled={pending}
              onChange={(e) => changeFreq(e.target.value as MascotFrequency)}
              className="mt-1 block min-h-11 w-full max-w-sm rounded-xl border-2 border-border-subtle bg-surface px-3 text-sm font-semibold focus:border-brand-primary focus:outline-none disabled:opacity-60"
            >
              {FREQS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <p
              className={`mt-1.5 max-w-xl text-sm leading-relaxed ${
                FREQS.find((f) => f.value === freq)?.warn
                  ? "font-semibold text-amber-900"
                  : "text-text-secondary"
              }`}
            >
              {FREQS.find((f) => f.value === freq)?.help}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              disabled={pending}
              aria-pressed={on}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold disabled:opacity-60 ${
                on
                  ? "border-2 border-brand-secondary text-brand-secondary-deep"
                  : "bg-brand-primary text-white hover:bg-brand-primary-deep"
              }`}
            >
              {pending ? "Guardando…" : on ? "Apagar Manzanito" : "Encender Manzanito"}
            </button>
            {note && (
              <span className="text-sm font-semibold text-brand-secondary-deep">{note}</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
