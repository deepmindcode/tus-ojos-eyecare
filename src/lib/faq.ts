/**
 * src/lib/faq.ts
 *
 * Saca pares pregunta/respuesta del propio markdown de la pagina.
 *
 * La fuente es la misma que lee el visitante. Asi nunca se le declara a
 * Google una respuesta que no este visible: marcar contenido oculto es
 * motivo de penalizacion, y ademas seria mentir en un formato que los
 * motores leen como verdad.
 */

export interface FaqItem {
  readonly q: string;
  readonly a: string;
}

function clean(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Formato `### Pregunta` + parrafo. Lo usa /patients/faq. */
export function faqFromHeadings(body: string): FaqItem[] {
  const out: FaqItem[] = [];

  for (const part of body.split(/^### +/m).slice(1)) {
    const [head, ...rest] = part.split("\n");
    const q = clean(head ?? "");
    const a = clean(rest.join(" "));
    if (q && a) out.push({ q, a });
  }

  return out;
}

/**
 * Formato `**Pregunta**` + respuesta, dentro de la seccion de preguntas
 * frecuentes. Lo usan las paginas de servicio.
 *
 * Se limita a esa seccion a proposito: en el resto de la pagina hay
 * negritas que no son preguntas.
 */
export function faqFromBold(body: string): FaqItem[] {
  const heading = /^#{2,3} +(?:Preguntas frecuentes|Frequently asked questions)\s*$/im;
  const match = heading.exec(body);
  if (!match) return [];

  // Desde el encabezado hasta el siguiente del mismo nivel o el final.
  const after = body.slice(match.index + match[0].length);
  const next = /^#{2,3} +/m.exec(after);
  const section = next ? after.slice(0, next.index) : after;

  const out: FaqItem[] = [];
  const pair = /^\*\*(.+?)\*\*\s*\n([\s\S]*?)(?=\n\s*\n\*\*|\n\s*\n#|$)/gm;

  let m: RegExpExecArray | null;
  while ((m = pair.exec(section)) !== null) {
    const q = clean(m[1] ?? "");
    const a = clean(m[2] ?? "");
    // Una respuesta de dos palabras no aporta nada a un motor de
    // respuestas, y ensucia el marcado.
    if (q && a.length > 20) out.push({ q, a });
  }

  return out;
}