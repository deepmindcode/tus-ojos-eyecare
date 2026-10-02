import type { ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LOCATIONS } from "@/config/site";
import type { ContentPage } from "@/lib/content";

/**
 * src/components/content/content-page.tsx
 *
 * Envoltorio de las páginas escritas en markdown. El texto viene del
 * archivo; esto le pone la tipografía de la marca y el cierre con los
 * teléfonos, que es lo que de verdad convierte en un sitio de óptica.
 *
 * No hay plugin de tipografía instalado, así que cada elemento lleva su
 * clase. Es más verboso y a cambio no añade una dependencia.
 */

interface Props {
  readonly content: ContentPage;
  readonly locale: string;
  /** Migas de pan opcionales, ya traducidas. */
  readonly breadcrumb?: ReactNode;
}

export function ContentPageBody({ content, locale, breadcrumb }: Props) {
  const isES = locale === "es";

  // El H1 sale del cuerpo para poder colocar la respuesta directa justo
  // debajo. Titulo -> respuesta -> contexto: ese es el orden que extrae
  // un motor de respuestas, y el que lee comodo una persona con prisa.
  const h1 = /^#[ \t]+(.+)$/m.exec(content.body);
  const heading = h1?.[1]?.trim() ?? "";
  const rest = h1 ? content.body.slice(h1.index + h1[0].length) : content.body;

  return (
    <article className="mx-auto w-[92%] max-w-[760px] py-12 lg:py-16">
      {breadcrumb && (
        <nav
          aria-label={isES ? "Ruta de navegación" : "Breadcrumb"}
          className="mb-6 text-[0.85rem] text-text-secondary"
        >
          {breadcrumb}
        </nav>
      )}

      {/* Datos sin confirmar: visible sólo en desarrollo, para que el
          equipo los vea sin que lleguen al paciente. */}
      {process.env.NODE_ENV !== "production" && content.verify.length > 0 && (
        <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-4 text-[0.85rem] text-amber-900">
          <p className="flex items-center gap-2 font-bold">
            <AlertTriangle className="size-4" aria-hidden="true" />
            Pendiente de confirmar con la oficina
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {content.verify.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {heading && (
        <h1 className="mt-0 font-display text-3xl font-extrabold leading-tight tracking-tight text-brand-primary sm:text-4xl">
          {heading}
        </h1>
      )}

      {content.answer && (
        <p className="mt-5 border-l-4 border-brand-secondary bg-brand-primary-tint px-5 py-4 text-[1.125rem] font-medium leading-relaxed text-text-primary">
          {content.answer}
        </p>
      )}

      <div className={heading ? "" : "[&>*:first-child]:mt-0"}>
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="mt-0 font-display text-3xl font-extrabold leading-tight tracking-tight text-brand-primary sm:text-4xl">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="mt-10 font-display text-2xl font-extrabold tracking-tight text-brand-primary">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="mt-8 font-display text-xl font-bold tracking-tight">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-text-secondary">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="mt-5 space-y-2.5 pl-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mt-5 list-decimal space-y-2.5 pl-6">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-[1.0625rem] leading-relaxed text-text-secondary [ul>&]:relative [ul>&]:pl-6 [ul>&]:before:absolute [ul>&]:before:left-0 [ul>&]:before:top-[0.6em] [ul>&]:before:size-2 [ul>&]:before:rounded-full [ul>&]:before:bg-brand-secondary">
                {children}
              </li>
            ),
            strong: ({ children }) => (
              <strong className="font-bold text-text-primary">{children}</strong>
            ),
            em: ({ children }) => <em className="italic">{children}</em>,
            a: ({ href, children }) => (
              <a
                href={href}
                className="font-semibold text-brand-primary underline decoration-brand-primary/40 underline-offset-2 hover:decoration-brand-primary"
              >
                {children}
              </a>
            ),
            table: ({ children }) => (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse text-[0.95rem]">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border-b border-border-subtle px-3 py-2 text-left font-bold">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border-b border-border-subtle px-3 py-2 align-top text-text-secondary">
                {children}
              </td>
            ),
            hr: () => <hr className="mt-10 border-border-subtle" />,
          }}
        >
          {rest}
        </Markdown>
      </div>

      {/* Cierre: el botón de cita y los tres teléfonos. En móvil marcar
          es un toque, y es como llega la mayoría. */}
      <aside className="mt-14 rounded-2xl border border-border-subtle bg-brand-primary-tint p-6">
        <h2 className="font-display text-xl font-extrabold tracking-tight text-brand-primary">
          {isES ? "¿Listo para tu cita?" : "Ready to schedule?"}
        </h2>
        <p className="mt-2 text-[0.95rem] text-text-secondary">
          {isES
            ? "Envía tu solicitud y te llamamos para coordinar el día y la hora."
            : "Send a request and we'll call you to arrange the day and time."}
        </p>

        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-[0.85rem] font-bold text-brand-secondary-deep">
          {isES
            ? "Se habla español · atención en español e inglés"
            : "Se habla español · we serve patients in Spanish and English"}
        </p>
        <Link
          href="/appointment"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-primary px-6 font-bold text-white hover:bg-brand-primary-deep"
        >
          {isES ? "Agendar cita" : "Schedule appointment"}
        </Link>

        <ul className="mt-6 grid gap-2 sm:grid-cols-3">
          {LOCATIONS.filter((l) => l.active).map((l) => (
            <li key={l.slug}>
              <a
                href={`tel:${l.phoneE164}`}
                className="flex min-h-11 items-center gap-2 rounded-lg bg-surface px-3 text-[0.9rem] font-semibold hover:bg-background"
              >
                <Phone
                  className="size-4 shrink-0 text-brand-secondary"
                  aria-hidden="true"
                />
                <span className="truncate">{l.city}</span>
                <span className="sr-only">
                  {isES ? "Llamar a" : "Call"} {isES ? l.nameES : l.nameEN}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </article>
  );
}