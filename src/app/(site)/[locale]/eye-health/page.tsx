import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { loadContent, listContentSlugs } from "@/lib/content";

/**
 * Indice de salud visual. La lista de articulos se arma leyendo
 * `content/eye-health/`: escribir un archivo nuevo lo publica, sin
 * tocar esta pagina.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isES = locale === "es";
  const content = await loadContent("eye-health", locale);

  return {
    title: content?.title || (isES ? "Salud Visual" : "Eye Health"),
    description: content?.description || undefined,
    alternates: {
      canonical: isES ? "/es/salud-visual" : "/eye-health",
      languages: {
        "en-US": "/eye-health",
        "es-US": "/es/salud-visual",
        "x-default": "/eye-health",
      },
    },
  };
}

export default async function EyeHealthPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isES = locale === "es";

  const intro = await loadContent("eye-health", locale);
  if (!intro) notFound();

  const slugs = await listContentSlugs("eye-health");
  const articles = (
    await Promise.all(
      slugs.map(async (slug) => {
        const a = await loadContent(`eye-health/${slug}`, locale);
        return a ? { slug, title: a.title.split(" | ")[0]!, description: a.description } : null;
      }),
    )
  ).filter((a): a is { slug: string; title: string; description: string } => a !== null);

  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto w-[92%] max-w-[860px]">
        <h1 className="font-display text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold leading-tight tracking-[-0.03em] text-brand-primary">
          {isES ? "Salud visual" : "Eye health"}
        </h1>
        <p className="mt-4 max-w-[62ch] text-[1.05rem] text-text-secondary">
          {isES
            ? "Preguntas que nos hacen todos los dias en el mostrador, contestadas con calma y sin tecnicismos. Nada de esto reemplaza una consulta."
            : "The questions we get at the front desk every day, answered plainly. None of this replaces a consultation."}
        </p>

        <ul className="mt-10 space-y-4">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link
                href={{ pathname: "/eye-health/[slug]", params: { slug: a.slug } }}
                className="group block rounded-2xl border border-border-subtle bg-surface p-6 hover:border-brand-primary"
              >
                <h2 className="flex items-start justify-between gap-4 font-display text-lg font-bold tracking-[-0.02em] text-brand-primary">
                  {a.title}
                  <ArrowRight
                    className="mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </h2>
                <p className="mt-2 text-[0.95rem] text-text-secondary">{a.description}</p>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <Link
            href="/appointment"
            className="inline-flex min-h-11 items-center rounded-full bg-brand-primary px-6 font-bold text-white hover:bg-brand-primary-deep"
          >
            {isES ? "Agendar cita" : "Schedule appointment"}
          </Link>
        </div>
      </div>
    </section>
  );
}