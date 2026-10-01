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

/** Dirección y dueño: los únicos que pueden destruir un mensaje. */
function isLeadership(user: Awaited<ReturnType<typeof getAdminUser>>): boolean {
  return ["SUPER_ADMIN", "OWNER"].some((r) => user?.roles.includes(r as never));
}

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

/**
 * Archivar: lo saca de la bandeja sin destruirlo.
 *
 * Es lo que se usa el 99% de las veces. El mensaje sigue en la base,
 * visible en la pestaña de archivados, y se puede devolver.
 */
export async function archiveMessages(ids: readonly string[]) {
  const user = await getAdminUser();
  if (!can(user, "messages:reply")) return { ok: false as const, error: "forbidden" };
  if (ids.length === 0) return { ok: true as const };

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("contact_messages")
    .update({ archived_at: now, archived_by: user!.id, updated_at: now })
    .in("id", ids);

  if (error) {
    console.error("[admin] fallo archivando mensajes:", error);
    return { ok: false as const, error: "server" };
  }

  after(async () => {
    await logAudit({
      userId: user!.id,
      action: "message.archived",
      objectType: "contact_message",
      details: { count: ids.length },
    });
  });

  return { ok: true as const };
}

/** Devolver a la bandeja algo archivado por error. */
export async function unarchiveMessages(ids: readonly string[]) {
  const user = await getAdminUser();
  if (!can(user, "messages:reply")) return { ok: false as const, error: "forbidden" };
  if (ids.length === 0) return { ok: true as const };

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("contact_messages")
    .update({
      archived_at: null,
      archived_by: null,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (error) {
    console.error("[admin] fallo desarchivando mensajes:", error);
    return { ok: false as const, error: "server" };
  }

  after(async () => {
    await logAudit({
      userId: user!.id,
      action: "message.unarchived",
      objectType: "contact_message",
      details: { count: ids.length },
    });
  });

  return { ok: true as const };
}

/**
 * Borrado definitivo. No se puede deshacer.
 *
 * Restringido a dirección a propósito, y pensado para el spam. Un
 * mensaje real de un paciente dice qué preguntó y qué se le prometió:
 * eso se archiva, no se destruye.
 *
 * El rastro en la auditoría sobrevive al borrado — la tabla de auditoría
 * es inmutable, así que queda constancia de que alguien borró algo
 * aunque el mensaje ya no exista.
 */
export async function deleteMessages(ids: readonly string[]) {
  const user = await getAdminUser();
  if (!isLeadership(user)) return { ok: false as const, error: "forbidden" };
  if (ids.length === 0) return { ok: true as const };

  const supabase = createSupabaseAdminClient();

  // Se registra ANTES de borrar: después ya no podríamos leer qué eran.
  const { data: doomed } = await supabase
    .from("contact_messages")
    .select("id, status, subject, created_at")
    .in("id", ids);

  const { error } = await supabase.from("contact_messages").delete().in("id", ids);

  if (error) {
    console.error("[admin] fallo borrando mensajes:", error);
    return { ok: false as const, error: "server" };
  }

  after(async () => {
    for (const m of doomed ?? []) {
      await logAudit({
        userId: user!.id,
        action: "message.deleted",
        objectType: "contact_message",
        objectId: m.id as string,
        // Sin nombre ni correo: el rastro dice QUÉ se borró, no sobre quién.
        details: {
          status: m.status as string,
          subject: m.subject as string,
          received: String(m.created_at),
        },
      });
    }
  });

  return { ok: true as const };
}