import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Registro de auditoría (§51).
 *
 * Se escribe con service_role porque `audit_logs` no tiene política de
 * INSERT: nadie puede fabricar entradas desde el navegador. Y no tiene
 * política de UPDATE ni DELETE, así que el histórico es inmutable —
 * ni un SUPER_ADMIN puede borrar sus propias huellas desde la API.
 *
 * Nunca metas datos de pacientes en `details`. El registro dice QUÉ se
 * hizo y sobre QUÉ objeto, no qué contenía.
 */
export async function logAudit(params: {
  userId: string;
  action: string;
  objectType: string;
  objectId?: string | null;
  result?: "success" | "failure";
  details?: Record<string, string | number | boolean>;
}): Promise<void> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    const ip = fwd ? fwd.split(",")[0]!.trim() : null;

    await createSupabaseAdminClient()
      .from("audit_logs")
      .insert({
        user_id: params.userId,
        action: params.action,
        object_type: params.objectType,
        object_id: params.objectId ?? null,
        result: params.result ?? "success",
        details: params.details ?? {},
        ip_address: ip,
        user_agent: h.get("user-agent")?.slice(0, 400) ?? null,
      });
  } catch (err) {
    // Un fallo de auditoría no debe tumbar la operación del usuario,
    // pero sí tiene que quedar visible en los logs del servidor.
    console.error("[audit] fallo registrando:", err);
  }
}
