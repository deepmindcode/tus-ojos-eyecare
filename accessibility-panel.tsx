"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Accessibility, X } from "lucide-react";

/**
 * Panel de accesibilidad opcional (§9).
 *
 * COMPLEMENTA la accesibilidad nativa del sitio, no la sustituye: la
 * navegación por teclado, el contraste, el alt text y la semántica ya
 * están en el marcado. Un overlay no arregla un sitio inaccesible.
 *
 * Las preferencias se guardan en localStorage. No requieren identificar
 * al usuario ni viajan al servidor.
 */

const TOGGLES = [
  "contrast",
  "grayscale",
  "underline",
  "spacing",
  "readable",
  "focus",
  "still",
] as const;

type Toggle = (typeof TOGGLES)[number];

const SIZES = [1, 1.15, 1.3] as const;
const STORAGE_KEY = "tus-ojos-a11y";

interface Prefs {
  toggles: Toggle[];
  size: number;
}

export function AccessibilityPanel() {
  const t = useTranslations("a11y");
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ toggles: [], size: 1 });
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const apply = useCallback((p: Prefs) => {
    const root = document.documentElement;
    TOGGLES.forEach((tg) => root.classList.toggle(`a11y-${tg}`, p.toggles.includes(tg)));
    root.style.setProperty("--a11y-step", String(p.size));
  }, []);

  // Restaura preferencias guardadas
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Prefs;
      const clean: Prefs = {
        toggles: (saved.toggles ?? []).filter((x): x is Toggle =>
          TOGGLES.includes(x as Toggle),
        ),
        size: SIZES.includes(saved.size as (typeof SIZES)[number]) ? saved.size : 1,
      };
      setPrefs(clean);
      apply(clean);
    } catch {
      // localStorage bloqueado o JSON corrupto: seguimos con los valores por defecto
    }
  }, [apply]);

  function update(next: Prefs) {
    setPrefs(next);
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Modo privado puede bloquear la escritura. La sesión actual sigue funcionando.
    }
  }

  function toggle(tg: Toggle) {
    const on = prefs.toggles.includes(tg);
    update({ ...prefs, toggles: on ? prefs.toggles.filter((x) => x !== tg) : [...prefs.toggles, tg] });
  }

  function reset() {
    update({ toggles: [], size: 1 });
  }

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label={t("title")}
        className="fixed bottom-20 right-4 z-40 grid size-13 min-h-11 min-w-11 place-items-center rounded-full bg-brand-primary p-3 text-white shadow-lg hover:bg-brand-primary-deep lg:bottom-4"
      >
        <Accessibility className="size-6" aria-hidden="true" />
      </button>

      {open && (
        <div
          id="a11y-panel"
          ref={panelRef}
          role="dialog"
          aria-label={t("title")}
          className="fixed bottom-36 right-4 z-40 max-h-[70vh] w-[min(330px,92vw)] overflow-y-auto rounded-2xl border border-border-subtle bg-surface p-5 shadow-2xl lg:bottom-20"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-brand-primary">{t("title")}</h2>
            <button type="button" onClick={close} aria-label={t("close")} className="p-1">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-dashed border-border-subtle py-2 text-sm">
            <span>{t("textSize")}</span>
            <div className="flex gap-1">
              {SIZES.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update({ ...prefs, size: s })}
                  aria-pressed={prefs.size === s}
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    prefs.size === s
                      ? "border-brand-secondary-deep bg-brand-secondary-deep text-white"
                      : "border-border-subtle bg-brand-secondary-tint text-brand-secondary-deep"
                  }`}
                >
                  {"A".padEnd(1) + "+".repeat(i)}
                </button>
              ))}
            </div>
          </div>

          {TOGGLES.map((tg) => {
            const on = prefs.toggles.includes(tg);
            return (
              <div
                key={tg}
                className="flex items-center justify-between gap-3 border-b border-dashed border-border-subtle py-2 text-sm last:border-0"
              >
                <span>{t(tg)}</span>
                <button
                  type="button"
                  onClick={() => toggle(tg)}
                  aria-pressed={on}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    on
                      ? "border-brand-secondary-deep bg-brand-secondary-deep text-white"
                      : "border-border-subtle bg-brand-secondary-tint text-brand-secondary-deep"
                  }`}
                >
                  {on ? t("on") : t("off")}
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={reset}
            className="mt-4 w-full rounded-full bg-brand-primary py-2.5 text-sm font-bold text-white hover:bg-brand-primary-deep"
          >
            {t("reset")}
          </button>
        </div>
      )}
    </>
  );
}
