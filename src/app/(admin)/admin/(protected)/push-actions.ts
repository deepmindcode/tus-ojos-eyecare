"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/auth/roles";
import type { PushMessage } from "@/lib/push";
import webpush from "web-push";

/**
 * src/app/(admin)/admin/(protected)/push-actions.ts
 *
 * Dar de alta y de baja el aparato de quien ha iniciado sesión.
 *
 * Se escribe con el cliente de SESIÓN, no con service_role: así la
 * política RLS (`user_id = auth.uid()`) es la que impide que nadie dé de
 * alta un buzón a nombre de otra persona. La comprobación no depende de
 * que este código esté bien escrito.
 */

export interface BrowserSubscription {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
}

export async function savePushSubscription(sub: BrowserSubscription, agent: string) {
  const user = await getAdminUser();
  if (!user) return { ok: false as const, error: "forbidden" };

  if (!sub.endpoint || !sub.p256dh || !sub.auth) {
    return { ok: false as const, error: "invalid" };
  }

  const supabase = await createSupabaseServerClient();

  // upsert por endpoint: el navegador renueva su buzón cada cierto
  // tiempo y volver a pulsar el botón no debe dejar filas muertas.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      user_agent: agent.slice(0, 300),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    console.error("[push] alta fallida:", error);
    return { ok: false as const, error: "server" };
  }
  return { ok: true as const };
}

export async function removePushSubscription(endpoint: string) {
  const user = await getAdminUser();
  if (!user) return { ok: false as const, error: "forbidden" };

  await (await createSupabaseServerClient())
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  return { ok: true as const };
}

/**
 * Aviso de prueba, sólo al aparato desde el que se pulsa.
 *
 * Va a ESE buzón y no a todos: probar que tu teléfono recibe no es razón
 * para hacer sonar el de las tres oficinas. Por eso no usa sendPushToAll.
 */
export async function sendTestPush(endpoint: string) {
  const user = await getAdminUser();
  if (!user) return { ok: false as const, error: "forbidden" };

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return { ok: false as const, error: "notConfigured" };

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("endpoint", endpoint)
    .single();

  if (!data) return { ok: false as const, error: "notFound" };

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:contact@tusojoseyecare.com",
    publicKey,
    privateKey,
  );

  const message: PushMessage = {
    title: "Test alert",
    body: "Notifications are working on this device.",
    url: "/admin",
    tag: "test",
  };

  try {
    await webpush.sendNotification(
      {
        endpoint: data.endpoint as string,
        keys: { p256dh: data.p256dh as string, auth: data.auth as string },
      },
      JSON.stringify(message),
    );
    return { ok: true as const };
  } catch (err) {
    console.error("[push] prueba fallida:", err);
    return { ok: false as const, error: "sendFailed" };
  }
}
