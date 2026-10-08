"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Download, Share, Plus, Check, Loader2 } from "lucide-react";
import {
  savePushSubscription,
  removePushSubscription,
  sendTestPush,
} from "@/app/(admin)/admin/(protected)/push-actions";

/**
 * src/components/admin/alerts-setup.tsx
 *
 * Instalar el panel como app y encender los avisos. Una sola tarjeta,
 * dos botones, sin ajustes que entender.
 *
 * Por qué así:
 *
 *   - Nada de esto se puede pedir desde el servidor. El permiso de avisos
 *     sólo lo concede el navegador, y sólo si lo pide un clic de la
 *     persona. Por eso hay un botón y no una casilla en los ajustes.
 *   - El iPhone es el caso difícil: Safari sólo deja avisar si el panel
 *     está instalado en la pantalla de inicio. Ahí no sirve el botón de
 *     instalar —Safari no lo ofrece—, hay que explicar los dos toques. Se
 *     explican con los iconos que el usuario ve en su pantalla.
 *   - La tarjeta desaparece cuando ya está todo encendido. Un panel de
 *     trabajo no debe llevar encima un cartel permanente de configuración.
 */

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad moderno se identifica como Mac; se distingue por el táctil.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function installed(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari en iOS no implementa display-mode; usa esta propiedad suya.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * base64url de la clave VAPID → los bytes que pide el navegador.
 *
 * Devuelve un ArrayBuffer y no un Uint8Array porque el tipado de
 * pushManager.subscribe no acepta un Uint8Array respaldado por un
 * SharedArrayBuffer; el búfer suelto no tiene esa ambigüedad.
 */
function vapidBytes(base64: string): ArrayBuffer {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
  return buf;
}

type Install = { prompt: () => Promise<void>; userChoice: Promise<unknown> };

export function AlertsSetup({ vapidKey }: { readonly vapidKey: string }) {
  const [ready, setReady] = useState(false);
  const [on, setOn] = useState(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [installEvent, setInstallEvent] = useState<Install | null>(null);
  const [isApp, setIsApp] = useState(false);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    /**
     * Todo lo que mira el navegador se resuelve en una sola pasada
     * asíncrona y se publica junta al final.
     *
     * Va así y no leyendo `navigator` durante el render porque en el
     * servidor ese objeto no existe: el HTML saldría con un estado y el
     * navegador lo sustituiría por otro nada más cargar. Hasta que esto
     * termina, el componente no pinta nada.
     */
    async function look() {
      const device = { ios: isIOS(), app: installed() };

      let current: PushSubscription | null = null;
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.register("/sw.js");
          current = await reg.pushManager.getSubscription();
        } catch (e) {
          console.error("[alerts] no se pudo registrar:", e);
        }
      }

      setIos(device.ios);
      setIsApp(device.app);
      if (current) {
        setOn(true);
        setEndpoint(current.endpoint);
      }
      setReady(true);
    }

    void look();

    function onPrompt(e: Event) {
      // Sin esto Chrome muestra su propia barra, que se ignora. Mejor un
      // botón dentro del panel, donde la persona ya está mirando.
      e.preventDefault();
      setInstallEvent(e as unknown as Install);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setNote(null);
    try {
      if (typeof Notification === "undefined") {
        setNote("This browser cannot show alerts.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNote(
          permission === "denied"
            ? "This device is blocking alerts. Turn notifications back on for tusojoseyecare.com in your browser settings, then try again."
            : "Alerts were not turned on.",
        );
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidBytes(vapidKey),
      });

      const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
      const res = await savePushSubscription(
        {
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        },
        navigator.userAgent,
      );

      if (!res.ok) {
        await sub.unsubscribe();
        setNote("Could not turn alerts on. Try again in a moment.");
        return;
      }

      setOn(true);
      setEndpoint(sub.endpoint);
      setNote("Alerts are on for this device.");
    } catch (e) {
      console.error("[alerts] fallo activando:", e);
      setNote("Could not turn alerts on from this device.");
    } finally {
      setBusy(false);
    }
  }, [vapidKey]);

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setOn(false);
      setEndpoint(null);
      setNote("Alerts are off for this device.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    if (!endpoint) return;
    setBusy(true);
    const r = await sendTestPush(endpoint);
    setNote(r.ok ? "Test alert sent — it should appear in a second." : "Could not send the test.");
    setBusy(false);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  }

  if (!ready) return null;

  const supported = typeof window !== "undefined" && "PushManager" in window;
  // En iPhone los avisos sólo existen si el panel está en la pantalla de
  // inicio. Mientras no lo esté, el botón no serviría de nada.
  const needsHomeScreen = ios && !isApp;
  const allSet = on && (isApp || !ios);

  if (allSet && dismissed) return null;

  return (
    <section className="mb-6 rounded-2xl border-2 border-brand-secondary bg-brand-secondary-tint p-5">
      <div className="flex flex-wrap items-start gap-3">
        <Bell className="mt-0.5 size-5 shrink-0 text-brand-secondary-deep" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-extrabold text-brand-secondary-deep">
            {on ? "Alerts are on" : "Get alerted when a new request arrives"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-brand-secondary-deep">
            {on
              ? "This device will buzz when someone books and nobody has contacted them yet — even with the panel closed. The alert never shows the patient's name or reason."
              : "Turn this on and the phone buzzes the moment a request comes in, even with the panel closed. The alert only says which office — never the patient's name or reason."}
          </p>

          {needsHomeScreen && (
            <div className="mt-3 rounded-xl bg-surface p-4 text-sm leading-relaxed">
              <strong className="block text-brand-secondary-deep">
                On iPhone, add the panel to the Home Screen first
              </strong>
              <p className="mt-1 text-text-secondary">
                Apple only allows alerts from apps on the Home Screen. Two taps in Safari:
              </p>
              <ol className="mt-2 grid gap-2">
                <li className="flex items-center gap-2">
                  <Share className="size-4 shrink-0 text-brand-primary" aria-hidden="true" />
                  <span>
                    Tap <strong>Share</strong> at the bottom of Safari.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Plus className="size-4 shrink-0 text-brand-primary" aria-hidden="true" />
                  <span>
                    Choose <strong>Add to Home Screen</strong>.
                  </span>
                </li>
              </ol>
              <p className="mt-2 text-text-secondary">
                Then open Tus Ojos from the Home Screen icon and come back here.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!on && supported && !needsHomeScreen && (
              <button
                type="button"
                onClick={() => void enable()}
                disabled={busy}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-primary-deep disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Bell className="size-4" aria-hidden="true" />
                )}
                Turn on alerts
              </button>
            )}

            {on && (
              <>
                <button
                  type="button"
                  onClick={() => void test()}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-bold text-brand-secondary-deep hover:bg-white disabled:opacity-60"
                >
                  <Check className="size-4" aria-hidden="true" />
                  Send a test
                </button>
                <button
                  type="button"
                  onClick={() => void disable()}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-brand-secondary px-4 text-sm font-bold text-brand-secondary-deep disabled:opacity-60"
                >
                  <BellOff className="size-4" aria-hidden="true" />
                  Turn off
                </button>
              </>
            )}

            {installEvent && !isApp && (
              <button
                type="button"
                onClick={() => void install()}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-bold text-brand-secondary-deep hover:bg-white"
              >
                <Download className="size-4" aria-hidden="true" />
                Install as an app
              </button>
            )}

            {allSet && (
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="min-h-11 rounded-full px-4 text-sm font-bold text-brand-secondary-deep underline"
              >
                Hide this
              </button>
            )}
          </div>

          {!supported && (
            <p className="mt-3 text-sm text-text-secondary">
              This browser cannot show alerts. Chrome, Edge and Safari can.
            </p>
          )}

          {note && (
            <p className="mt-3 text-sm font-semibold text-brand-secondary-deep">{note}</p>
          )}
        </div>
      </div>
    </section>
  );
}
