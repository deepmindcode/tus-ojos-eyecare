import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * src/app/(admin)/admin/(protected)/trends/data.ts
 *
 * Cuenta solicitudes por año, por mes y por motivo.
 *
 * Los meses se calculan en la zona de las sedes, no en UTC. Una solicitud
 * enviada a las ocho de la tarde del 31 de enero en Camden son las dos de
 * la madrugada del 1 de febrero en el servidor: sin esto, cada mes
 * perdería unas cuantas solicitudes a favor del siguiente, y el patrón
 * que se busca aquí es justamente el de los bordes de temporada.
 */

const OFFICE_TIME_ZONE = "America/New_York";

/** 5000 solicitudes son más de lo que estas tres sedes generan en años. */
const MAX_ROWS = 5000;

export const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export interface Bucket {
  readonly label: string;
  readonly value: number;
  /** Porcentaje sobre el total del conjunto mostrado. */
  readonly percent: number;
}

export interface TrendsData {
  readonly total: number;
  readonly messages: number;
  /** Años con datos, del más reciente al más antiguo. */
  readonly years: readonly number[];
  readonly byYear: readonly Bucket[];
  /** Doce posiciones siempre, aunque alguna valga cero. */
  readonly byMonth: readonly Bucket[];
  readonly byReason: readonly Bucket[];
  readonly byOffice: readonly Bucket[];
  /** Mes con más solicitudes del conjunto mostrado. */
  readonly peakMonth: Bucket | null;
  readonly topReason: Bucket | null;
  /** Comparación con el mismo periodo del año anterior, si existe. */
  readonly previousYearTotal: number | null;
}

const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: OFFICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
});

/** Año y mes (0-11) de una fecha, leídos en la zona de las sedes. */
function officeYearMonth(iso: string): { year: number; month: number } {
  const parts = PARTS.formatToParts(new Date(iso));
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value) - 1;
  return { year, month };
}

function toBuckets(counts: Map<string, number>, total: number): Bucket[] {
  return [...counts.entries()]
    .map(([label, value]) => ({
      label,
      value,
      percent: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * @param year Año a mostrar, o null para todos. Con null, los meses se
 *   suman entre años: es lo que enseña la temporada, no el calendario.
 */
export const loadTrends = cache(async (year: number | null): Promise<TrendsData> => {
  const supabase = await createSupabaseServerClient();

  const [requests, messages] = await Promise.all([
    supabase
      .from("appointment_requests")
      .select("created_at, reason, status, locations(city)")
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
    supabase
      .from("contact_messages")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
  ]);

  if (requests.error) console.error("[trends] solicitudes:", requests.error);

  const rows = (requests.data ?? []).map((r) => ({
    ...officeYearMonth(r.created_at as string),
    reason: (r.reason as string) ?? "unspecified",
    status: r.status as string,
    office: (r.locations as unknown as { city?: string } | null)?.city ?? "—",
  }));

  // Los años salen de TODAS las filas: el selector tiene que ofrecer
  // años aunque el filtro actual los esconda.
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a);

  const scope = year === null ? rows : rows.filter((r) => r.year === year);
  const total = scope.length;

  // Por año: siempre sobre todo el histórico, porque su trabajo es
  // comparar años entre sí.
  const yearCounts = new Map<string, number>();
  for (const r of rows) {
    yearCounts.set(String(r.year), (yearCounts.get(String(r.year)) ?? 0) + 1);
  }
  const byYear = [...yearCounts.entries()]
    .map(([label, value]) => ({
      label,
      value,
      percent: rows.length > 0 ? (value / rows.length) * 100 : 0,
    }))
    .sort((a, b) => Number(b.label) - Number(a.label));

  // Por mes: doce posiciones fijas y en orden de calendario. Ordenarlas
  // por tamaño rompería la lectura de temporada, que es para lo que está.
  const monthCounts = new Array(12).fill(0) as number[];
  for (const r of scope) monthCounts[r.month]! += 1;
  const byMonth: Bucket[] = monthCounts.map((value, i) => ({
    label: MONTHS_SHORT[i]!,
    value,
    percent: total > 0 ? (value / total) * 100 : 0,
  }));

  const reasonCounts = new Map<string, number>();
  for (const r of scope) reasonCounts.set(r.reason, (reasonCounts.get(r.reason) ?? 0) + 1);

  const officeCounts = new Map<string, number>();
  for (const r of scope) officeCounts.set(r.office, (officeCounts.get(r.office) ?? 0) + 1);

  const peak = byMonth.reduce<Bucket | null>(
    (best, m) => (m.value > 0 && (!best || m.value > best.value) ? m : best),
    null,
  );

  const byReason = toBuckets(reasonCounts, total);

  const prev = year !== null ? rows.filter((r) => r.year === year - 1).length : null;

  return {
    total,
    messages: (messages.data ?? []).length,
    years,
    byYear,
    byMonth,
    byReason,
    byOffice: toBuckets(officeCounts, total),
    peakMonth: peak,
    topReason: byReason[0] ?? null,
    previousYearTotal: prev && prev > 0 ? prev : null,
  };
});

/** "EYE_EXAM" -> "Eye exam" */
export function humanizeReason(value: string): string {
  const s = value.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
