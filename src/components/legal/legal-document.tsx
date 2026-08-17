import { readFile } from "node:fs/promises";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle } from "lucide-react";

/**
 * Renderiza un documento legal desde content/legal/{slug}.{locale}.md
 *
 * El texto vive en archivos markdown y no en la base de datos todavía. En
 * la fase del CMS se moverá a la tabla `pages` para que se edite desde el
 * panel; hasta entonces, cambiar una política implica un despliegue, lo
 * cual para un documento revisado por un abogado es incluso deseable.
 *
 * Cada versión de idioma es un archivo independiente. No se genera una
 * a partir de la otra: son jurídicamente equivalentes, no traducciones.
 */

export const LEGAL_SLUGS = [
  "privacy",
  "terms",
  "accessibility",
  "sms-terms",
  "cookies",
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

async function readDocument(slug: LegalSlug, locale: string): Promise<string | null> {
  const safeLocale = locale === "es" ? "es" : "en";
  const file = path.join(process.cwd(), "content", "legal", `${slug}.${safeLocale}.md`);
  try {
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

export async function LegalDocument({
  slug,
  locale,
}: {
  readonly slug: LegalSlug;
  readonly locale: string;
}) {
  const content = await readDocument(slug, locale);
  const isES = locale === "es";

  if (!content) {
    return (
      <p className="text-text-secondary">
        {isES ? "Documento no disponible." : "Document unavailable."}
      </p>
    );
  }

  return (
    <article className="legal-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Los encabezados del markdown empiezan en h2 porque el h1 de
          // la página lo pone el layout: una página, un h1.
          h2: ({ children }) => (
            <h2 className="mt-10 font-display text-xl font-bold tracking-tight text-brand-primary">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 font-display text-lg font-bold">{children}</h3>
          ),
          table: ({ children }) => (
            <div className="my-5 overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border-subtle py-2 pr-4 text-left font-bold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border-subtle py-2 pr-4 align-top">{children}</td>
          ),
          a: ({ href, children }) => (
            <a href={href} className="text-brand-primary underline underline-offset-2">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}

/**
 * Aviso de revisión pendiente.
 *
 * Se muestra mientras los documentos no hayan pasado por un abogado. NO
 * lo quites porque quede feo: publicar políticas sin revisar y sin
 * advertirlo es peor que la molestia visual. Se elimina cuando el
 * abogado firme, y en ese momento se pone la fecha de revisión.
 */
export function LegalReviewNotice({ locale }: { readonly locale: string }) {
  const isES = locale === "es";
  return (
    <p className="mt-6 flex gap-3 rounded-r-xl border-l-4 border-warning bg-[#FBF0DC] p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
      <span>
        <strong>{isES ? "Borrador pendiente de revisión legal." : "Draft pending legal review."}</strong>{" "}
        {isES
          ? "Este documento aún no ha sido revisado por un abogado y no debe considerarse definitivo."
          : "This document has not yet been reviewed by an attorney and should not be treated as final."}
      </span>
    </p>
  );
}
