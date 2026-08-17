"use server";

import { after } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminUser, can } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";

const STATUSES = [
  "NEW",
  "CONTACT_ATTEMPTED",
  "PATIENT_REACHED",
  "CONFIRMED",
  "RESCHEDULE_REQUESTED",
  "CANCELLED",
  "COMPLETED",
  "NO_RESPONSE",
  "SPAM",
] as const;

export type AppointmentStatus = (typeof STATUSES)[number];

/**
 * Cambia el estado de una solicitud.
 *
 * Se ejecuta con el cliente de SESIÓN, no con service_role: así las
 * políticas RLS se aplican también aquí. Si un día este código tuviera
 * un fallo de permisos, la base seguiría negando la escritura.
 */
export async function updateAppointmentStatus(id: string, status: string) {
  const user = await getAdminUser();
  if (!can(user, "appointments:update")) {
    return { ok: false as const, error: "forbidden" };
  }
  if (!STATUSES.includes(status as AppointmentStatus)) {
    return { ok: false as const, error: "invalidStatus" };
  }

  const supabase = await createSupabaseServerClient();

  // Una sola llamada: lee el estado anterior, actualiza y registra el
  // historial dentro de la misma transacción. Antes eran tres viajes de
  // red separados, y en cada clic se notaban.
  const { data: previous, error } = await supabase.rpc("change_appointment_status", {
    p_id: id,
    p_status: status,
  });

  if (error) {
    console.error("[admin] fallo cambiando estado:", error);
    after(async () => {
      await logAudit({
        userId: user!.id,
        action: "appointment.status_change",
        objectType: "appointment_request",
        objectId: id,
        result: "failure",
      });
    });
    return { ok: false as const, error: "server" };
  }

  // La auditoría se escribe DESPUÉS de responder al navegador: es
  // obligatoria, pero el usuario no tiene por qué esperarla.
  after(async () => {
    await logAudit({
      userId: user!.id,
      action: "appointment.status_change",
      objectType: "appointment_request",
      objectId: id,
      details: { from: (previous as string) ?? "unknown", to: status },
    });
  });

  // Sin revalidatePath a propósito: rehacía toda la página en el servidor
  // —seis consultas más— en cada clic. La interfaz ya refleja el cambio
  // de forma optimista y devolvemos aquí lo necesario para el historial.
  return {
    ok: true as const,
    entry: {
      action: "status_changed",
      from: (previous as string) ?? null,
      to: status,
      who: user!.displayName,
      at: new Date().toISOString(),
    } satisfies ActivityEntry,
  };
}

/**
 * Registra que alguien abrió los datos de una solicitud.
 *
 * §51 exige registrar quién VIO qué, no sólo quién lo cambió. En un
 * expediente sanitario, la consulta es tan auditable como la edición.
 */
/**
 * Historial de una solicitud, y registro de que alguien la abrió.
 *
 * Las dos cosas van juntas a propósito: desplegar una ficha es acceder a
 * datos del paciente, y §51 exige registrar quién VIO qué, no sólo quién
 * lo cambió. Antes eran dos llamadas al servidor por cada clic; ahora
 * una, y la auditoría se escribe después de responder.
 */

export interface ActivityEntry {
  readonly action: string;
  readonly from: string | null;
  readonly to: string | null;
  readonly who: string;
  readonly at: string;
}

/**
 * Historial de una solicitud: quién hizo qué y cuándo.
 *
 * Es lo que permite el seguimiento real. Cuando recepción de Camden marca
 * "contactado", esto queda registrado con su nombre y la hora, y Wilfredo
 * lo ve sin tener que preguntar a nadie.
 *
 * Se lee con el cliente de sesión: si el RLS no te deja ver la cita,
 * tampoco te deja ver su historial.
 */
export async function getAppointmentActivity(id: string): Promise<ActivityEntry[]> {
  const user = await getAdminUser();
  if (!can(user, "appointments:read")) return [];

  const supabase = await createSupabaseServerClient();
  const entries = await readActivity(supabase, id);

  after(async () => {
    await logAudit({
      userId: user!.id,
      action: "appointment.viewed",
      objectType: "appointment_request",
      objectId: id,
    });
  });

  return entries;
}

type Db = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function readActivity(supabase: Db, id: string): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from("appointment_activities")
    .select("action, previous_value, new_value, created_at, user_id")
    .eq("appointment_id", id)
    .neq("action", "viewed")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !data) {
    console.error("[admin] fallo leyendo actividad:", error);
    return [];
  }

  // Resolver nombres en una sola consulta
  const ids = [...new Set(data.map((d) => d.user_id).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from("staff_profiles")
      .select("user_id, display_name")
      .in("user_id", ids);
    for (const p of profiles ?? []) {
      names.set(p.user_id as string, p.display_name as string);
    }
  }

  return data.map((d) => ({
    action: d.action as string,
    from: (d.previous_value as string) ?? null,
    to: (d.new_value as string) ?? null,
    who: names.get(d.user_id as string) ?? "Staff member",
    at: d.created_at as string,
  }));
}
