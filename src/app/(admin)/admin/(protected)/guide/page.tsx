import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Info, LifeBuoy, Phone, Printer } from "lucide-react";
import { getAdminUser, can } from "@/lib/auth/roles";
import {
  getGuide,
  DEVELOPER_SUPPORT,
  type GuideLang,
  type GuideAudience,
} from "@/lib/guide";

/**
 * src/app/(admin)/admin/(protected)/guide/page.tsx
 *
 * Manual de uso del panel. Lo ve todo el personal; el contenido cambia
 * segun el rol, porque a recepcion no le sirve leer como se da de alta
 * un usuario y a direccion no le basta con lo de recepcion.
 *
 * El idioma va en la direccion (?lang=en) en vez de en un estado de
 * cliente: asi se puede enviar el enlace ya en el idioma de la persona y
 * se imprime en el idioma que se esta viendo.
 */

export const metadata = { title: "Guide" };

export default async function GuidePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const sp = await searchParams;
  const lang: GuideLang = sp.lang === "en" ? "en" : "es";

  // Quien gestiona usuarios dirige el panel. Es el mismo corte que ya
  // decide si se ve Team, asi que no inventamos un criterio nuevo.
  const audience: GuideAudience = can(user, "users:manage") ? "LEADERSHIP" : "FRONT_DESK";
  const doc = getGuide(audience, lang);
  const isES = lang === "es";

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-primary">
            {doc.title}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">{doc.intro}</p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <div className="flex overflow-hidden rounded-full border-2 border-border-subtle">
            {(["es", "en"] as const).map((l) => (
              <Link
                key={l}
                href={`/admin/guide?lang=${l}`}
                aria-current={lang === l ? "true" : undefined}
                className={`px-3.5 py-1.5 text-xs font-bold uppercase ${
                  lang === l
                    ? "bg-brand-primary text-white"
                    : "bg-surface text-text-secondary hover:text-brand-primary"
                }`}
              >
                {l}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Indice: el manual es largo y casi siempre se entra buscando una
          cosa concreta, no a leerlo entero. */}
      <nav
        aria-label={isES ? "Secciones" : "Sections"}
        className="mt-7 rounded-2xl border border-border-subtle bg-surface p-4 print:hidden"
      >
        <ol className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {doc.sections.map((s, i) => (
            <li key={s.id} className="flex gap-2">
              <span className="w-5 shrink-0 text-right font-bold tabular-nums text-brand-secondary-deep">
                {i + 1}.
              </span>
              <a href={`#${s.id}`} className="font-semibold hover:text-brand-primary hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-12">
        {doc.sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-6">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-brand-primary">
              <span className="mr-2 tabular-nums text-brand-secondary-deep">{i + 1}.</span>
              {s.title}
            </h2>

            <div className="mt-4 space-y-4">
              {s.blocks.map((b, j) => {
                const key = `${s.id}-${j}`;

                if (b.kind === "text") {
                  return (
                    <p key={key} className="text-[1.0125rem] leading-relaxed text-text-secondary">
                      {b.text}
                    </p>
                  );
                }

                if (b.kind === "steps") {
                  return (
                    <ol key={key} className="space-y-2.5">
                      {b.items.map((it, k) => (
                        <li key={it} className="flex gap-3 text-[1.0125rem] leading-relaxed text-text-secondary">
                          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-primary-tint text-xs font-bold text-brand-primary">
                            {k + 1}
                          </span>
                          <span>{it}</span>
                        </li>
                      ))}
                    </ol>
                  );
                }

                if (b.kind === "defs") {
                  return (
                    <dl key={key} className="divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle">
                      {b.defs.map((d) => (
                        <div key={d.term} className="gap-4 p-4 sm:flex">
                          <dt className="shrink-0 font-bold sm:w-52">{d.term}</dt>
                          <dd className="mt-1 text-[0.95rem] leading-relaxed text-text-secondary sm:mt-0">
                            {d.desc}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  );
                }

                const warn = b.kind === "warn";
                const Icon = warn ? AlertTriangle : Info;
                return (
                  <p
                    key={key}
                    className={`flex gap-3 rounded-2xl border p-4 text-[0.95rem] leading-relaxed ${
                      warn
                        ? "border-amber-300 bg-amber-50 text-amber-900"
                        : "border-border-subtle bg-brand-secondary-tint text-brand-secondary-deep"
                    }`}
                  >
                    <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                    <span>{b.text}</span>
                  </p>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Soporte: lo ultimo, porque es lo que se busca cuando lo demas
          no ha resuelto el problema. */}
      <section className="mt-14 rounded-2xl border-2 border-brand-primary bg-brand-primary-tint p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-primary">
          <LifeBuoy className="size-5" aria-hidden="true" />
          {isES ? "¿Algo no funciona?" : "Something not working?"}
        </h2>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-text-secondary">
          {isES
            ? "Primero prueba a cerrar sesión y volver a entrar: resuelve la mayoría de los casos. Si el problema sigue, llama o escribe al desarrollador y cuéntale qué estabas haciendo cuando ocurrió."
            : "First try signing out and back in: it resolves most cases. If it persists, call or text the developer and say what you were doing when it happened."}
        </p>
        <a
          href={`tel:${DEVELOPER_SUPPORT.phoneE164}`}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-primary-deep"
        >
          <Phone className="size-4" aria-hidden="true" />
          {DEVELOPER_SUPPORT.name} · {DEVELOPER_SUPPORT.phone}
        </a>
        <p className="mt-3 text-xs text-text-secondary">
          {isES
            ? "No le mandes capturas con datos de pacientes: descríbele el problema."
            : "Do not send screenshots containing patient data: describe the problem instead."}
        </p>
      </section>

      <p className="mt-8 flex items-center gap-2 text-sm text-text-secondary print:hidden">
        <Printer className="size-4" aria-hidden="true" />
        {isES
          ? "Puedes imprimir esta página para tenerla en el mostrador."
          : "You can print this page to keep it at the front desk."}
      </p>
    </div>
  );
}
