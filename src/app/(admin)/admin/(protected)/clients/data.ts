import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildClients, type ClientRecord, type ClientSource } from "@/lib/clients";

/**
 * src/app/(admin)/admin/(protected)/clients/data.ts
 *
 * Trae las solicitudes y los mensajes y los convierte en fichas de
 * cliente. Las tres páginas del directorio (lista, ficha e impresión)
 * piden lo mismo, y `cache()` hace que una misma petición no consulte
 * dos veces.
 *
 * Usa el cliente de sesión, no el de servicio: las políticas RLS siguen
 * mandando aunque este código tuviera un fallo.
 */

/** Dos mil envíos de cada tipo son años de historia para tres sedes. */
const MAX_ROWS = 2000;

export const loadClients = cache(async (): Promise<ClientRecord[]> => {
  const supabase = await createSupabaseServerClient();

  const [appointments, messages] = await Promise.all([
    supabase
      .from("appointment_requests")
      .select(
        "id, first_name, last_name, phone, email, reason, notes, status, created_at, preferred_date, preferred_time, promotion_label, communication_preference, patient_status, locations(city)",
      )
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
    supabase
      .from("contact_messages")
      .select("id, name, email, phone, subject, message, status, created_at, locations(city)")
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
  ]);

  if (appointments.error) console.error("[clients] citas:", appointments.error);
  if (messages.error) console.error("[clients] mensajes:", messages.error);

  const city = (row: { locations?: unknown }): string | null =>
    (row.locations as { city?: string } | null)?.city ?? null;

  const sources: ClientSource[] = [];

  for (const r of appointments.data ?? []) {
    sources.push({
      name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
      phone: (r.phone as string) ?? null,
      email: (r.email as string) ?? null,
      event: {
        kind: "appointment",
        id: r.id as string,
        at: r.created_at as string,
        office: city(r),
        reason: (r.reason as string) ?? null,
        detail: (r.notes as string) ?? null,
        status: r.status as string,
        promotionLabel: (r.promotion_label as string) ?? null,
        preferredDate: (r.preferred_date as string) ?? null,
        preferredTime: (r.preferred_time as string) ?? null,
        contactPreference: (r.communication_preference as string) ?? null,
        patientStatus: (r.patient_status as string) ?? null,
      },
    });
  }

  for (const m of messages.data ?? []) {
    sources.push({
      name: ((m.name as string) ?? "").trim(),
      phone: (m.phone as string) ?? null,
      email: (m.email as string) ?? null,
      event: {
        kind: "message",
        id: m.id as string,
        at: m.created_at as string,
        office: city(m),
        reason: (m.subject as string) ?? null,
        detail: (m.message as string) ?? null,
        status: m.status as string,
        promotionLabel: null,
        preferredDate: null,
        preferredTime: null,
        contactPreference: null,
        patientStatus: null,
      },
    });
  }

  return buildClients(sources);
});

/** Fecha corta y legible, en la zona de las sedes. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Fecha y hora, para el historial. */
export function longDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "APPOINTMENT_REQUEST" -> "appointment request" */
export function humanize(value: string | null): string {
  return value ? value.replace(/_/g, " ").toLowerCase() : "—";
}
