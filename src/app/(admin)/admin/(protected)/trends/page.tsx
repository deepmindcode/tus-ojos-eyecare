import { redirect } from "next/navigation";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { getAdminUser, can } from "@/lib/auth/roles";
import { RefreshBar } from "@/components/admin/refresh-bar";
import { officeClock } from "@/lib/office-time";
import { MonthBars, RankBars, StatTile } from "@/components/admin/charts";
import { loadTrends, humanizeReason, MONTHS_EN, MONTHS_SHORT } from "./data";

/**
 * src/app/(admin)/admin/(protected)/trends/page.tsx
 *
 * Qué meses y qué años traen más solicitudes, y por qué motivo vienen.
 *
 * Por defecto se suman todos los años: lo que se busca aquí es la
 * temporada, y un solo año no la enseña. Los años se comparan en su
 * propia gráfica, que es donde esa pregunta se responde bien.
 *
 * Un único filtro arriba que afecta a todo lo de abajo. Filtros dentro de
 * cada tarjeta harían que dos gráficas de la misma pantalla hablaran de
 * periodos distintos sin avisar.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "Trends" };

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await getAdminUser();
  if (!can(user, "metrics:read")) redirect("/admin");

  const sp = await searchParams;
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : null;

  const d = await loadTrends(year);

  const scopeLabel = year === null ? "All years" : String(year);
  const monthCaption =
    year === null
      ? "Requests by month · all years combined"
      : `Requests by month · ${year}`;

  const peakName = d.peakMonth ? MONTHS_EN[MONTHS_SHORT.indexOf(d.peakMonth.label as never)] : null;

  const change =
    year !== null && d.previousYearTotal
      ? ((d.total - d.previousYearTotal) / d.previousYearTotal) * 100
      : null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-brand-primary">
            <TrendingUp className="size-6" aria-hidden="true" />
            Trends
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Where the requests come from, and when. {scopeLabel} · {d.total} requests
          </p>
        </div>
        <RefreshBar updatedAt={officeClock()} label="Updated" />
      </div>

      {/* Una sola fila de filtros, arriba de todo lo que afecta. */}
      <div className="mt-6 flex flex-wrap gap-2">
        <YearChip label="All years" active={year === null} />
        {d.years.map((y) => (
          <YearChip key={y} label={String(y)} active={year === y} year={y} />
        ))}
      </div>

      {d.total === 0 ? (
        <p className="mt-10 rounded-2xl border border-border-subtle bg-surface p-8 text-center text-text-secondary">
          No requests in this period yet. The charts appear as soon as the first
          one arrives.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Requests"
              value={String(d.total)}
              {...(change !== null
                ? {
                    hint: `${change >= 0 ? "+" : ""}${change.toFixed(0)}% vs ${year! - 1}`,
                  }
                : {})}
            />
            <StatTile
              label="Busiest month"
              value={peakName ?? "—"}
              {...(d.peakMonth
                ? { hint: `${d.peakMonth.value} requests · ${d.peakMonth.percent.toFixed(1)}% of the period` }
                : {})}
            />
            <StatTile
              label="Most requested"
              value={d.topReason ? humanizeReason(d.topReason.label) : "—"}
              {...(d.topReason
                ? { hint: `${d.topReason.value} requests · ${d.topReason.percent.toFixed(1)}%` }
                : {})}
            />
            <StatTile
              label="Messages"
              value={String(d.messages)}
              hint="All time, separate from requests"
            />
          </div>

          <div className="mt-6">
            <MonthBars data={d.byMonth} caption={monthCaption} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <RankBars
              data={d.byReason.map((r) => ({ ...r, label: humanizeReason(r.label) }))}
              caption={`Why they ask for an appointment · ${scopeLabel}`}
              unitLabel="requests"
            />
            <RankBars
              data={d.byOffice}
              caption={`Requests by office · ${scopeLabel}`}
              unitLabel="requests"
            />
          </div>

          <div className="mt-6">
            <RankBars
              data={d.byYear}
              caption="Requests by year · all time"
              unitLabel="requests"
            />
          </div>
        </>
      )}

      <p className="mt-6 max-w-2xl text-xs leading-relaxed text-text-secondary">
        Los meses se cuentan en la hora de las sedes, no en la del servidor, para
        que una solicitud de las ocho de la tarde del día 31 no cuente como del
        mes siguiente. Aquí sólo hay solicitudes recibidas: una solicitud no es
        una cita cumplida.
      </p>
    </>
  );
}

function YearChip({
  label,
  active,
  year,
}: {
  readonly label: string;
  readonly active: boolean;
  readonly year?: number;
}) {
  return (
    <Link
      href={year ? `/admin/trends?year=${year}` : "/admin/trends"}
      aria-current={active ? "true" : undefined}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${
        active
          ? "border-brand-primary bg-brand-primary text-white"
          : "border-border-subtle bg-surface text-text-secondary hover:border-brand-secondary"
      }`}
    >
      {label}
    </Link>
  );
}
