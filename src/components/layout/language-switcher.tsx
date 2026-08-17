"use client";

import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * Cambia de idioma manteniendo la MISMA página.
 * usePathname de next-intl devuelve la ruta interna (/services), no la
 * localizada (/servicios), así que el router resuelve el slug correcto
 * del idioma destino. Nunca manda al usuario a la home.
 */
export function LanguageSwitcher({ variant = "light" }: { readonly variant?: "light" | "dark" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();
  const current = (params.locale as string) ?? routing.defaultLocale;

  function switchTo(locale: string) {
    if (locale === current) return;
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- params tipados por ruta; aquí reenviamos los actuales
        { pathname, params },
        { locale },
      );
    });
  }

  const border = variant === "dark" ? "border-white/50" : "border-border-subtle";
  const text = variant === "dark" ? "text-white" : "text-text-secondary";

  return (
    <div
      className={`inline-flex overflow-hidden rounded-full border ${border} ${isPending ? "opacity-60" : ""}`}
      role="group"
      aria-label="Language / Idioma"
    >
      {routing.locales.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => switchTo(locale)}
            aria-pressed={active}
            className={`px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${
              active
                ? variant === "dark"
                  ? "bg-white text-brand-primary"
                  : "bg-brand-primary text-white"
                : text
            }`}
          >
            {locale}
          </button>
        );
      })}
    </div>
  );
}
