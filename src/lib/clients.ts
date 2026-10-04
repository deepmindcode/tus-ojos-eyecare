/**
 * src/lib/clients.ts
 *
 * Reúne en una sola ficha todo lo que una misma persona ha enviado por
 * el sitio: solicitudes de cita y mensajes de contacto.
 *
 * EL PROBLEMA: el formulario no pide cuenta ni la obliga a identificarse.
 * La misma persona puede pedir cita en marzo, escribir un mensaje en
 * julio y volver a pedir cita en noviembre, y cada envío es una fila
 * suelta. Sin unirlas, dirección no puede saber si alguien lleva tres
 * intentos sin que le devuelvan la llamada.
 *
 * CÓMO SE UNEN: por teléfono primero, por correo después. Si dos envíos
 * comparten CUALQUIERA de los dos, son la misma persona, aunque el nombre
 * esté escrito distinto ("Jose" y "José M.").
 *
 * POR QUÉ SE CALCULA AL LEER Y NO SE GUARDA UN ID DE CLIENTE: guardar la
 * identidad en el momento de enviar obligaría a decidir con un solo dato
 * y para siempre. Calculándola al leer, el día que alguien escribe desde
 * un correo nuevo con el teléfono de siempre, el historial se une solo,
 * también hacia atrás. Y nada de esto toca lo que ya está guardado.
 *
 * LO QUE NO HACE: unir dos personas distintas que comparten teléfono —
 * un matrimonio, una madre que pide cita para su hijo. Es el error que
 * preferimos: juntar de más se ve al abrir la ficha; separar de más
 * esconde que a alguien no se le ha llamado.
 */

export type ClientEventKind = "appointment" | "message";

export interface ClientEvent {
  readonly kind: ClientEventKind;
  readonly id: string;
  /** ISO 8601 */
  readonly at: string;
  readonly office: string | null;
  /** Motivo de la cita, o asunto del mensaje. */
  readonly reason: string | null;
  /** Notas de la cita, o cuerpo del mensaje. */
  readonly detail: string | null;
  readonly status: string;
  readonly promotionLabel: string | null;
  readonly preferredDate: string | null;
  readonly preferredTime: string | null;
  readonly contactPreference: string | null;
  readonly patientStatus: string | null;
}

export interface ClientRecord {
  /** Identificador estable para la dirección de la ficha. */
  readonly key: string;
  readonly name: string;
  readonly phones: readonly string[];
  readonly emails: readonly string[];
  readonly offices: readonly string[];
  /** Motivos por los que ha pedido cita, del más repetido al menos. */
  readonly reasons: readonly string[];
  readonly firstSeen: string;
  readonly lastSeen: string;
  readonly appointmentCount: number;
  readonly messageCount: number;
  /** Más reciente primero. */
  readonly events: readonly ClientEvent[];
}

/** Lo mínimo para identificar a quien envió algo. */
export interface ClientSource {
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly event: ClientEvent;
}

/**
 * Teléfono reducido a diez dígitos.
 *
 * "(856) 365-1500", "856-365-1500" y "+1 856 365 1500" son el mismo
 * número y en la base están los tres. Sin esto, la misma persona sale
 * tres veces en la lista.
 */
export function phoneKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  return ten.length === 10 ? ten : null;
}

export function emailKey(raw: string | null | undefined): string | null {
  const v = raw?.trim().toLowerCase();
  return v && v.includes("@") ? v : null;
}

/** Teléfono para mostrar: (856) 365-1500 */
export function formatPhone(ten: string): string {
  return /^\d{10}$/.test(ten)
    ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
    : ten;
}

/* ----------------------------------------------------------------- */

/**
 * Conjuntos disjuntos.
 *
 * Hace falta porque la unión es transitiva: un envío con teléfono A y
 * correo X, otro con correo X y teléfono B. A y B nunca aparecen juntos,
 * pero son la misma persona. Agrupar por un solo campo no lo ve.
 */
class Groups {
  private readonly parent = new Map<string, string>();

  find(x: string): string {
    const p = this.parent.get(x);
    if (p === undefined) {
      this.parent.set(x, x);
      return x;
    }
    if (p === x) return x;
    const root = this.find(p);
    this.parent.set(x, root); // compresión de caminos
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export function buildClients(sources: readonly ClientSource[]): ClientRecord[] {
  const groups = new Groups();

  // Identificadores de cada envío, ya normalizados.
  const ids = sources.map((s) => {
    const p = phoneKey(s.phone);
    const e = emailKey(s.email);
    const list: string[] = [];
    if (p) list.push(`p:${p}`);
    if (e) list.push(`e:${e}`);
    // Sin teléfono ni correo no hay a quién unirlo: queda solo.
    if (list.length === 0) list.push(`x:${s.event.id}`);
    return list;
  });

  for (const list of ids) {
    const first = list[0]!;
    for (const id of list) groups.union(first, id);
  }

  interface Bucket {
    ids: Set<string>;
    sources: ClientSource[];
  }
  const buckets = new Map<string, Bucket>();

  sources.forEach((s, i) => {
    const root = groups.find(ids[i]![0]!);
    const b = buckets.get(root) ?? { ids: new Set<string>(), sources: [] };
    for (const id of ids[i]!) b.ids.add(id);
    b.sources.push(s);
    buckets.set(root, b);
  });

  const out: ClientRecord[] = [];

  for (const b of buckets.values()) {
    const events = [...b.sources]
      .map((s) => s.event)
      .sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0));

    const byRecency = [...b.sources].sort((x, y) =>
      x.event.at < y.event.at ? 1 : x.event.at > y.event.at ? -1 : 0,
    );

    // El nombre más reciente que no venga vacío: si alguien corrigió su
    // nombre en el último envío, ése es el bueno.
    const name =
      byRecency.find((s) => s.name.trim().length > 0)?.name.trim() ?? "—";

    const phones = [...b.ids]
      .filter((id) => id.startsWith("p:"))
      .map((id) => id.slice(2))
      .sort();
    const emails = [...b.ids]
      .filter((id) => id.startsWith("e:"))
      .map((id) => id.slice(2))
      .sort();

    const offices = [...new Set(events.map((e) => e.office).filter(Boolean))] as string[];

    // Los motivos, ordenados por cuántas veces los ha pedido: quien ha
    // venido tres veces por ojo seco y una por gafas es, para una oferta,
    // un caso de ojo seco.
    const reasonCount = new Map<string, number>();
    for (const e of events) {
      if (e.kind !== "appointment" || !e.reason) continue;
      reasonCount.set(e.reason, (reasonCount.get(e.reason) ?? 0) + 1);
    }
    const reasons = [...reasonCount.entries()]
      .sort((x, y) => y[1] - x[1])
      .map(([r]) => r);

    out.push({
      // La clave es el identificador menor del grupo: no cambia mientras
      // la persona siga usando los mismos datos.
      key: [...b.ids].sort()[0]!,
      name,
      phones,
      emails,
      offices,
      reasons,
      firstSeen: events[events.length - 1]!.at,
      lastSeen: events[0]!.at,
      appointmentCount: events.filter((e) => e.kind === "appointment").length,
      messageCount: events.filter((e) => e.kind === "message").length,
      events,
    });
  }

  // Lo más reciente arriba: es por donde se mira.
  return out.sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : a.lastSeen > b.lastSeen ? -1 : 0));
}

/** Busca por nombre, teléfono o correo. El teléfono, por dígitos. */
export function matchesQuery(c: ClientRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const digits = q.replace(/\D/g, "");
  if (digits.length >= 3 && c.phones.some((p) => p.includes(digits))) return true;

  return (
    c.name.toLowerCase().includes(q) ||
    c.emails.some((e) => e.includes(q)) ||
    c.offices.some((o) => o.toLowerCase().includes(q))
  );
}

/**
 * ¿Ha pedido cita alguna vez por este motivo?
 *
 * Es lo que permite sacar la lista de quien vino por cataratas o por ojo
 * seco y ofrecerle algo que de verdad le sirva. Mira TODO el historial,
 * no sólo la última solicitud: alguien que preguntó por ojo seco hace un
 * año sigue siendo un caso de ojo seco.
 */
export function hasReason(c: ClientRecord, reason: string): boolean {
  return c.reasons.includes(reason);
}

/** Los motivos presentes en el conjunto, para poblar el desplegable. */
export function allReasons(clients: readonly ClientRecord[]): string[] {
  const seen = new Set<string>();
  for (const c of clients) for (const r of c.reasons) seen.add(r);
  return [...seen].sort();
}
