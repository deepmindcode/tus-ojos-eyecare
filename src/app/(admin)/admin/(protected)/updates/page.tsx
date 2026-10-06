import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminUser, can } from "@/lib/auth/roles";
import { CURRENT_RELEASE, RELEASES, type ReleaseLang } from "@/lib/releases";

/**
 * src/app/(admin)/admin/(protected)/updates/page.tsx
 *
 * Control de versiones del sitio: que version esta en linea y que cambio
 * en cada actualizacion. Solo direccion: es informacion de quien decide
 * sobre el sitio, no de mostrador.
 *
 * El idioma va en la direccion (?lang=en), igual que en el manual.
 */

export const metadata = { title: "Updates" };

const LOCALE: Record<ReleaseLang, string> = { es: "es-US", en: "en-US" };
const formatDate = (date: string, lang: ReleaseLang) =>
  new Intl.DateTimeFormat(LOCALE[lang], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(date));
const formatMonth = (month: string, lang: ReleaseLang) => {
  const text = new Intl.DateTimeFormat(LOCALE[lang], { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01`));
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  if (!can(user, "users:manage")) redirect("/admin");

  const sp = await searchParams;
  const lang: ReleaseLang = sp.lang === "en" ? "en" : "es";
  const isES = lang === "es";
  const months = [...new Set(RELEASES.map((r) => r.date.slice(0, 7)))];

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-primary">
            {isES ? "Novedades del sitio" : "Website updates"}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">
            {isES
              ? "El control de versiones: cada actualización que se publica queda anotada aquí, con su número, su fecha y lo que cambió."
              : "The version history: every update that is published is recorded here, with its number, its date and what changed."}
          </p>
        </div>

        <div className="flex overflow-hidden rounded-full border-2 border-border-subtle">
          {(["es", "en"] as const).map((l) => (
            <Link
              key={l}
              href={`/admin/updates?lang=${l}`}
              aria-current={lang === l ? "true" : undefined}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase ${
                lang === l ? "bg-brand-primary text-white" : "bg-surface text-text-secondary hover:text-brand-primary"
              }`}
            >
              {l}
            </Link>
          ))}
        </div>
      </header>

      <section className="mt-7 rounded-2xl border border-border-subtle bg-brand-primary-tint p-5">
        <p className="text-sm font-semibold text-text-secondary">{isES ? "Versión en línea" : "Live version"}</p>
        <p className="mt-1 font-display text-4xl font-extrabold tracking-tight text-brand-primary tabular-nums">
          {isES ? "Versión" : "Version"} {CURRENT_RELEASE.version}
        </p>
        <p className="mt-1 text-[0.95rem] text-text-secondary">
          {isES ? "Publicada el" : "Published on"} {formatDate(CURRENT_RELEASE.date, lang)}
          {": "}
          {CURRENT_RELEASE.title[lang]}.
        </p>
      </section>

      <div className="mt-10 space-y-10">
        {months.map((month) => (
          <section key={month}>
            <h2 className="font-display text-xl font-extrabold tracking-tight text-brand-primary">{formatMonth(month, lang)}</h2>
            <ol className="mt-4 space-y-3">
              {RELEASES.filter((r) => r.date.startsWith(month)).map((r) => (
                <li key={r.version} className="rounded-2xl border border-border-subtle bg-surface p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-bold">
                      <span className="tabular-nums text-brand-secondary-deep">
                        {isES ? "Versión" : "Version"} {r.version}.{" "}
                      </span>
                      {r.title[lang]}
                    </h3>
                    <time dateTime={r.date} className="text-sm text-text-secondary">
                      {formatDate(r.date, lang)}
                    </time>
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.95rem] leading-relaxed text-text-secondary">
                    {r.changes[lang].map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm text-text-secondary">
        {isES
          ? "Si una actualización da problemas, se puede volver a la versión anterior en minutos: escríbele al desarrollador y dile el número de versión."
          : "If an update causes trouble, the previous version can be restored in minutes: write to the developer and mention the version number."}
      </p>
    </div>
  );
}
