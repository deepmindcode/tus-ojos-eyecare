import webpush from "web-push";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * src/lib/push.ts
 *
 * Avisos al teléfono o al ordenador del equipo.
 *
 * La regla es la misma que en los correos internos (§21): el aviso NO
 * lleva datos del paciente. Ni nombre, ni teléfono, ni motivo de
 * consulta. Dice que hay una solicitud nueva y en qué oficina. Un aviso
 * se lee en la pantalla bloqueada, a veces con alguien al lado y a veces
 * en un teléfono que no está en la consulta.
 *
 * Y nunca rompe nada de lo que va antes: si el envío falla, se registra y
 * se sigue. La cita ya está guardada; un aviso perdido es molesto, una
 * cita perdida es un paciente perdido.
 */

export interface PushMessage {
  readonly title: string;
  readonly body: string;
  readonly url?: string;
  readonly tag?: string;
}

function configure(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:contact@tusojoseyecare.com",
    publicKey,
    privateKey,
  );
  return true;
}

/**
 * Manda el aviso a todos los aparatos dados de alta.
 *
 * Los buzones muertos se borran solos. Un navegador que se desinstaló o
 * al que se le revocó el permiso devuelve 404 o 410, y guardarlo para
 * siempre haría que cada aviso futuro arrastrase intentos condenados a
 * fallar. Cualquier otro error (un corte de red, un servicio caído) NO
 * borra nada: el buzón puede estar perfectamente bien.
 */
export async function sendPushToAll(message: PushMessage): Promise<void> {
  if (!configure()) {
    console.warn("[push] sin claves VAPID; aviso omitido");
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (error) {
    console.error("[push] no se pudieron leer las suscripciones:", error);
    return;
  }
  if (!subs || subs.length === 0) return;

  const payload = JSON.stringify(message);
  const dead: string[] = [];
  const alive: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint as string,
            keys: { p256dh: s.p256dh as string, auth: s.auth as string },
          },
          payload,
        );
        alive.push(s.id as string);
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          dead.push(s.id as string);
        } else {
          console.error("[push] fallo enviando:", code ?? err);
        }
      }
    }),
  );

  if (dead.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", dead);
  }
  if (alive.length > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ last_ok_at: new Date().toISOString() })
      .in("id", alive);
  }
}

/** El aviso de una solicitud nueva. Sin datos del paciente, a propósito. */
export async function pushNewAppointment(office: string): Promise<void> {
  await sendPushToAll({
    title: "New appointment request",
    body: `${office} · nobody has contacted them yet`,
    url: "/admin?status=NEW",
    tag: "new-appointment",
  });
}
