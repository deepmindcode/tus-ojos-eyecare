import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { MapPin, Phone, Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LOCATIONS } from "@/config/site";
import { JsonLd } from "@/components/seo/json-ld";
import { locationListSchema } from "@/lib/schema";

/**
 * Indice de sedes. Se construye desde `LOCATIONS` y no desde markdown:
 * las direcciones y telefonos ya viven en la configuracion, y tenerlos
 * en dos sitios garantiza que un dia dejen de coincidir.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isES = locale === "es";

  return {
    title: isES ? "Nuestras Oficinas | Tus Ojos Eyecare" : "Our Offices | Tus Ojos Eyecare",
    description: isES
      ? "Tres oficinas para atenderte: Camden y Cherry Hill en New Jersey, y Filadelfia en Pennsylvania."
      : "Three offices to serve you: Camden and Cherry Hill in New Jersey, and Philadelphia in Pennsylvania.",
    alternates: {
      canonical: isES ? "/es/ubicaciones" : "/locations",
      languages: {
        "en-US": "/locations",
        "es-US": "/es/ubicaciones",
        "x-default": "/locations",
      },
    },
  };
}

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isES = locale === "es";

  const offices = LOCATIONS.filter((l) => l.active);

  return (
    <section className="py-12 lg:py-16">
      <JsonLd data={locationListSchema(locale)} />
      <div className="mx-auto w-[92%] max-w-[1200px]">
        <h1 className="font-display text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold leading-tight tracking-[-0.03em] text-brand-primary">
          {isES ? "Nuestras oficinas" : "Our offices"}
        </h1>
        <p className="mt-4 max-w-[60ch] text-[1.05rem] text-text-secondary">
          {isES
            ? "Elige la oficina que te quede mejor. Los servicios disponibles pueden variar, asi que conviene confirmar por telefono antes de tu visita."
            : "Choose the office most convenient for you. Available services can vary, so it is worth confirming by phone before your visit."}
        </p>

        <ul className="mt-10 grid gap-6 lg:grid-cols-3">
          {offices.map((l) => {
            const slug = isES ? l.slugES : l.slug;
            const name = isES ? l.nameES : l.nameEN;

            return (
              <li
                key={l.slug}
                className="flex flex-col rounded-2xl border border-border-subtle bg-surface p-6"
              >
                <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-brand-primary">
                  {l.city}
                  {l.isPrincipal && (
                    <span className="ml-2 align-middle rounded-full bg-brand-secondary-tint px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-brand-secondary-deep">
                      {isES ? "Principal" : "Main"}
                    </span>
                  )}
                </h2>
                <p className="sr-only">{name}</p>

                <p className="mt-3 flex items-start gap-2 text-[0.95rem] text-text-secondary">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-brand-secondary" aria-hidden="true" />
                  <span>
                    {l.addressLine1}
                    <br />
                    {l.city}, {l.state} {l.postalCode}
                  </span>
                </p>

                <p className="mt-3 flex items-center gap-2 text-[0.95rem] text-text-secondary">
                  <Clock className="size-4 shrink-0 text-brand-secondary" aria-hidden="true" />
                  {isES ? l.hours.daysES : l.hours.daysEN} {l.hours.time}
                </p>

                <div className="mt-6 flex flex-col gap-2">
                  <a
                    href={`tel:${l.phoneE164}`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-primary px-5 font-bold text-white hover:bg-brand-primary-deep"
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    {l.phone}
                  </a>
                  <Link
                    href={{ pathname: "/locations/[slug]", params: { slug } }}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-brand-primary px-5 font-bold text-brand-primary hover:bg-brand-primary-tint"
                  >
                    {isES ? "Ver esta oficina" : "View this office"}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-12">
          <Link
            href="/appointment"
            className="inline-flex min-h-11 items-center rounded-full bg-brand-secondary-deep px-6 font-bold text-white hover:opacity-90"
          >
            {isES ? "Agendar cita" : "Schedule appointment"}
          </Link>
        </div>
      </div>
    </section>
  );
}