"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Widget invisible de Cloudflare Turnstile.
 *
 * En modo "managed" la mayoría de personas no ve nada: Cloudflare valora
 * señales del navegador y emite el token en silencio. Sólo muestra un
 * reto si algo resulta sospechoso. Es la razón de elegirlo frente a un
 * CAPTCHA de imágenes, que castiga a todos —y especialmente a quien usa
 * lector de pantalla— para frenar a unos pocos.
 *
 * Si no hay clave configurada, el componente no renderiza nada y el
 * formulario sigue funcionando. El servidor decide qué hacer con eso.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          language?: string;
        },
      ) => string;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function Turnstile({
  onToken,
  locale,
}: {
  readonly onToken: (token: string | null) => void;
  readonly locale: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !ref.current) return;

    let cancelled = false;

    function render() {
      if (cancelled || !ref.current || !window.turnstile) return;
      if (widgetId.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey!,
        theme: "light",
        language: locale === "es" ? "es" : "en",
        callback: (token) => onToken(token),
        // Token caducado o error de red: se invalida y el usuario
        // reintenta. Nunca dejamos un token viejo en el formulario.
        "expired-callback": () => onToken(null),
        "error-callback": () => {
          setFailed(true);
          onToken(null);
        },
      });
    }

    if (window.turnstile) {
      render();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", render);
      } else {
        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.onload = render;
        script.onerror = () => setFailed(true);
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [siteKey, locale, onToken]);

  if (!siteKey) return null;

  return (
    <div className="mt-4">
      <div ref={ref} />
      {failed && (
        <p className="text-sm text-text-secondary">
          {locale === "es"
            ? "No se pudo cargar la verificación de seguridad. Revisa tu conexión o llama a la oficina."
            : "The security check could not load. Check your connection or call the office."}
        </p>
      )}
    </div>
  );
}
