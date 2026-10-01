"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { X, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { consentPending } from "@/components/layout/cookie-notice";

/**
 * Popup de promoción.
 *
 * Al hacer clic en el CTA lleva a /appointment?promo=<slug>, donde el
 * formulario muestra el descuento y —si la promoción es de una sola
 * sede— la deja ya elegida.
 *
 * Reglas que NO son negociables (§87, §88, §89, §98):
 *   - Nunca en páginas legales, el panel ni durante el formulario de cita
 *   - Nunca al instante: por defecto espera unos segundos
 *   - Una vez cada 24 h por visitante, no en cada página
 *   - Diálogo accesible: foco atrapado, ESC cierra, foco devuelto
 *   - En móvil no tapa la pantalla completa
 */

interface Promotion {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  readonly discount_label: string | null;
  readonly terms: string | null;
  readonly cta_type: string;
  readonly cta_label: string | null;
  readonly display_type: "MODAL" | "CORNER" | "TOP_BAR" | "BOTTOM_BAR" | "INLINE";
  readonly delay_seconds: number;
  readonly dismissible: boolean;
  readonly frequency: string;
  readonly exclusive_location_slug: string | null;
}

const SEEN_KEY = "tus-ojos-promo-seen";

/** Frecuencias en milisegundos. `every_visit` no guarda nada. */
const FREQUENCY_MS: Record<string, number> = {
  once_session: 0,
  once_24h: 86_400_000,
  once_7d: 604_800_000,
  once_visitor: Number.MAX_SAFE_INTEGER,
  every_visit: -1,
};

function wasSeen(slug: string, frequency: string): boolean {
  if (frequency === "every_visit") return false;

  try {
    if (frequency === "once_session") {
      return sessionStorage.getItem(`${SEEN_KEY}:${slug}`) !== null;
    }
    const raw = localStorage.getItem(`${SEEN_KEY}:${slug}`);
    if (!raw) return false;
    const window = FREQUENCY_MS[frequency] ?? FREQUENCY_MS.once_24h!;
    return Date.now() - Number(raw) < window;
  } catch {
    // Modo privado o almacenamiento bloqueado: preferimos no mostrar
    // nada antes que mostrarlo en cada página.
    return true;
  }
}

function markSeen(slug: string, frequency: string): void {
  try {
    if (frequency === "once_session") {
      sessionStorage.setItem(`${SEEN_KEY}:${slug}`, "1");
    } else {
      localStorage.setItem(`${SEEN_KEY}:${slug}`, String(Date.now()));
    }
  } catch {
    // Sin almacenamiento, el popup reaparecerá. Es el mal menor.
  }
}

export function PromotionPopup() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  const [promo, setPromo] = useState<Promotion | null>(null);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Ruta sin el prefijo de idioma: el targeting del admin se escribe en
  // rutas neutras (/services), no en /es/servicios.
  const neutralPath = pathname.replace(/^\/es(?=\/|$)/, "") || "/";

  const blocked =
    neutralPath.startsWith("/legal") ||
    neutralPath.startsWith("/appointment") ||
    pathname.startsWith("/admin");

  const track = useCallback(
    (event: string, id: string) => {
      void createClient().rpc("track_promotion_event", {
        p_promotion_id: id,
        p_event: event,
        p_locale: locale,
        p_location: null,
      });
    },
    [locale],
  );

  useEffect(() => {
    if (blocked) return;
    // Mientras el aviso de cookies este en pantalla no apilamos una
    // segunda tarjeta encima: en movil no caben las dos.
    if (consentPending()) return;
    let cancelled = false;

    async function load() {
      const { data, error } = await createClient()
        .rpc("get_promotion_for_page", { p_path: neutralPath, p_locale: locale })
        .maybeSingle();

      if (cancelled || error || !data) return;
      const p = data as unknown as Promotion;
      if (wasSeen(p.slug, p.frequency)) return;

      const timer = setTimeout(
        () => {
          if (cancelled) return;
          previousFocus.current = document.activeElement as HTMLElement;
          setPromo(p);
          setVisible(true);
          markSeen(p.slug, p.frequency);
          track("impression", p.id);
        },
        Math.max(3, p.delay_seconds) * 1000,
      );

      return () => clearTimeout(timer);
    }

    const cleanup = load();
    return () => {
      cancelled = true;
      void cleanup.then((fn) => fn?.());
    };
  }, [neutralPath, locale, blocked, track]);

  const close = useCallback(() => {
    if (promo) track("dismiss", promo.id);
    setVisible(false);
    previousFocus.current?.focus();
  }, [promo, track]);

  // ESC cierra, y el foco queda atrapado mientras esté abierto
  useEffect(() => {
    if (!visible || !promo) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && promo!.dismissible) {
        close();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a[href], button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, promo, close]);

  if (!visible || !promo) return null;

  function accept() {
    if (!promo) return;
    track("cta_click", promo.id);
    track("appointment_start", promo.id);
    setVisible(false);

    const prefix = locale === "es" ? "/es/cita" : "/appointment";
    router.push(`${prefix}?promo=${encodeURIComponent(promo.slug)}`);
  }

  const isModal = promo.display_type === "MODAL";
  const isES = locale === "es";

  return (
    <>
      {isModal && (
        <div
          className="fixed inset-0 z-[90] bg-black/50"
          onClick={() => promo.dismissible && close()}
          aria-hidden="true"
        />
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal={isModal}
        aria-labelledby="promo-title"
        className={
          isModal
            ? "fixed left-1/2 top-1/2 z-[91] w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-subtle bg-surface p-6 shadow-2xl"
            : // En móvil se ancla abajo pero deja ver la página: nunca
              // tapa la pantalla completa (§88).
              "fixed bottom-24 right-4 z-[91] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-border-subtle bg-surface p-5 shadow-2xl lg:bottom-6"
        }
      >
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary-tint px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-brand-primary">
            <Tag className="size-3.5" aria-hidden="true" />
            {isES ? "Promoción" : "Offer"}
          </span>

          {promo.dismissible && (
            <button
              type="button"
              onClick={close}
              aria-label={isES ? "Cerrar promoción" : "Close offer"}
              className="-m-2 rounded-lg p-2 text-text-secondary hover:bg-background"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <h2
          id="promo-title"
          className="mt-3 font-display text-xl font-extrabold leading-tight tracking-tight text-brand-primary"
        >
          {promo.title}
        </h2>

        {promo.discount_label && (
          <p className="mt-2 border-l-[3px] border-brand-secondary pl-3 font-display text-lg font-bold">
            {promo.discount_label}
          </p>
        )}

        {promo.description && (
          <p className="mt-3 text-[0.95rem] text-text-secondary">{promo.description}</p>
        )}

        <button
          type="button"
          onClick={accept}
          className="mt-5 flex min-h-11 w-full items-center justify-center rounded-full bg-brand-primary px-6 font-bold text-white hover:bg-brand-primary-deep"
        >
          {promo.cta_label ?? (isES ? "Agendar cita" : "Schedule appointment")}
        </button>

        {/* Las condiciones van en texto, nunca dentro de una imagen (§95) */}
        {promo.terms && (
          <p className="mt-3 text-xs leading-relaxed text-text-secondary">{promo.terms}</p>
        )}
      </div>
    </>
  );
}