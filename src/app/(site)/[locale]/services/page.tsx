import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { loadContent, listContentSlugs } from "@/lib/content";

/**
 * Indice de servicios. Las tarjetas se arman leyendo `content/services/`:
 * escribir un archivo nuevo publica el servicio, sin tocar esta pagina ni
 * una lista que habria que recordar actualizar.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isES = locale === "es";
  const content = await loadContent("services", locale);

  return {
    title: content?.title || (isES ? "Servicios" : "Services"),
    description: content?.description || undefined,
    alternates: {
      canonical: isES ? "/es/servicios" : "/services",
      languages: {
        "en-US": "/services",
        "es-US": "/es/servicios",
        "x-default": "/services",
      },
    },
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isES = locale === "es";

  const intro = await loadContent("services", locale);
  if (!intro) notFound();

  const slugs = await listContentSlugs("services");
  const services = (
    await Promise.all(
      slugs.map(async (slug) => {
        const s = await loadContent(`services/${slug}`, locale);
        return s ? { slug, title: s.title.split(" | ")[0]!, description: s.description } : null;
      }),
    )
  ).filter((s): s is { slug: string; title: string; description: string } => s !== null);

  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto w-[92%] max-w-[1000px]">
        <h1 className="font-display text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold leading-tight tracking-[-0.03em] text-brand-primary">
          {isES
            ? "Cuidado profesional para la salud de tus ojos"
            : "Professional care for your family's vision"}
        </h1>
        <p className="mt-4 max-w-[62ch] text-[1.05rem] text-text-secondary">
          {isES
            ? "Los exámenes de la vista los realizan profesionales acreditados para ello, que evalúan cada caso de forma individual. Los servicios disponibles pueden variar según la sede."
            : "Eye examinations are performed by accredited eye care professionals who assess each case individually. Available services can vary by office."}
        </p>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {services.map((s) => (
            <li key={s.slug}>
              <Link
                href={{ pathname: "/services/[slug]", params: { slug: s.slug } }}
                className="group flex h-full flex-col rounded-2xl border border-border-subtle bg-surface p-6 hover:border-brand-primary"
              >
                <h2 className="flex items-start justify-between gap-3 font-display text-lg font-bold tracking-[-0.02em] text-brand-primary">
                  {s.title}
                  <ArrowRight
                    className="mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </h2>
                <p className="mt-2 text-[0.95rem] text-text-secondary">{s.description}</p>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/appointment"
            className="inline-flex min-h-11 items-center rounded-full bg-brand-primary px-6 font-bold text-white hover:bg-brand-primary-deep"
          >
            {isES ? "Agendar cita" : "Schedule appointment"}
          </Link>
          <Link
            href="/locations"
            className="inline-flex min-h-11 items-center rounded-full border-2 border-brand-primary px-6 font-bold text-brand-primary hover:bg-brand-primary-tint"
          >
            {isES ? "Ver las oficinas" : "See our offices"}
          </Link>
        </div>
      </div>
    </section>
  );
}