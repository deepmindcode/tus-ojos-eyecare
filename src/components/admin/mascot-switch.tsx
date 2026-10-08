"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { setManzanito } from "@/app/(admin)/admin/(protected)/offers/actions";

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
export function MascotSwitch({ initial }: { readonly initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

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
