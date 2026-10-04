"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/**
 * src/components/admin/refresh-bar.tsx
 *
 * Mantiene la pantalla al día sin que nadie recargue.
 *
 * Por qué `router.refresh()` y no un websocket: la página ya es dinámica
 * y se renderiza en el servidor en cada petición, así que refrescarla
 * trae los datos nuevos con el filtro, los permisos y las políticas RLS
 * que tocan. Un canal en vivo exigiría repetir toda esa lógica en el
 * cliente para ganar unos segundos.
 *
 * La hora de actualización la calcula el SERVIDOR y llega como texto ya
 * formateado. Si la formatease aquí, el HTML del servidor y el del
 * navegador no coincidirían y React se quejaría en cada carga.
 *
 * Mientras la pestaña está en segundo plano no se refresca: no tiene
 * sentido consultar la base cada medio minuto para nadie.
 */
export function RefreshBar({
  updatedAt,
  intervalSeconds = 45,
  label,
}: {
  /** Hora ya formateada en el servidor, p. ej. "08:32 AM". */
  readonly updatedAt: string;
  readonly intervalSeconds?: number;
  readonly label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const id = window.setInterval(tick, intervalSeconds * 1000);

    // Al volver a la pestaña, al día de inmediato en vez de esperar al
    // siguiente intervalo.
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalSeconds]);

  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary">
      <span aria-live="polite">
        {label} {updatedAt}
      </span>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-3 font-bold hover:border-brand-secondary hover:text-brand-primary disabled:opacity-60"
      >
        <RefreshCw
          className={`size-3.5 ${pending ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
        {pending ? "…" : "Refresh"}
      </button>
    </div>
  );
}
