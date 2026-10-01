"use server";

import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAdminUser, can } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import type { MessageStatus } from "./types";

/**
 * src/app/(admin)/admin/(protected)/inbox/actions.ts
 *
 * Bandeja de mensajes del formulario de contacto.
 *
 * Leer un mensaje deja rastro en la auditoría: contiene el nombre, el
 * correo y el teléfono de una persona, y quién lo abrió debe quedar
 * registrado. El rastro se escribe DESPUÉS de responder (`after`), para
 * que no retrase lo que ve quien está trabajando.
 */

/** Abrir un mensaje lo marca leído y queda registrado. */
export async function openMessage(id: string) {
  const user = await getAdminUser();
  if (!can(user, "messages:read")) return { ok: false as const };

  const supabase = createSupabaseAdminClient();

  // Solo pasa de UNREAD a READ: si alguien ya lo puso EN PROGRESO o
  // RESPONDIDO, abrirlo no debe hacerlo retroceder.
  await supabase
    .from("contact_messages")
    .update({ status: "READ", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "UNREAD");

  after(async () => {
    await logAudit({
      userId: user!.id,
      action: "message.viewed",
      objectType: "contact_message",
      objectId: id,
    });
  });

  return { ok: true as const };
}

export async function setMessageStatus(id: string, status: MessageStatus) {
  const user = await getAdminUser();

  // Marcar leído lo puede hacer quien lee. Cerrar, responder o marcar
  // como spam cambia el estado del trabajo de la oficina, y eso exige
  // permiso de respuesta.
  const needsReply = status !== "READ";
  if (needsReply ? !can(user, "messages:reply") : !can(user, "messages:read")) {
    return { ok: false as const, error: "forbidden" };
  }

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("contact_messages")
    .update({
      status,
      updated_at: new Date().toISOString(),
      // Quien lo trabaja queda asignado: evita que dos personas llamen
      // al mismo paciente.
      ...(status === "IN_PROGRESS" ? { assigned_to: user!.id } : {}),
    })
    .eq("id", id);

  if (error) {
    console.error("[admin] fallo cambiando estado del mensaje:", error);
    return { ok: false as const, error: "server" };
  }

  after(async () => {
    await logAudit({
      userId: user!.id,
      action: `message.${status.toLowerCase()}`,
      objectType: "contact_message",
      objectId: id,
      details: { status },
    });
  });

  return { ok: true as const };
}