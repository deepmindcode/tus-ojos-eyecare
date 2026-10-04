import type { Bucket } from "@/app/(admin)/admin/(protected)/trends/data";

/**
 * src/components/admin/charts.tsx
 *
 * Dos formas de gráfica y una ficha de dato, en HTML y CSS. Sin
 * librería: son barras proporcionales, y traer un paquete de gráficas
 * para esto cuesta más kilobytes que todo el panel.
 *
 * Reglas que se siguen aquí y conviene no deshacer:
 *
 *   - UNA serie, UN color. Pintar cada barra de un tono distinto según
 *     su tamaño no añade información: la longitud ya lo dice, y gasta el
 *     único canal libre que queda.
 *   - El número no va encima de cada barra. Se etiqueta sólo el máximo;
 *     el resto se lee en la tabla que acompaña a cada gráfica.
 *   - La gráfica nunca es la única forma de leer el dato. Debajo de cada
 *     una hay una tabla con los mismos números: es lo que la hace
 *     legible con un lector de pantalla y lo que sobrevive al imprimir.
 *   - Rejilla y ejes en el tono más suave disponible: la línea nunca
 *     compite con el dato.
 */

/**
 * Techo de las barras, en porcentaje del alto del area.
 *
 * No es 100 a proposito: la barra mas alta lleva su cifra encima, y con
 * el techo al 100 esa cifra se sale de la grafica y se mete en el titulo.
 */
const BAR_CEILING = 88;

/** Barras verticales en orden de calendario. Para la estacionalidad. */
export function MonthBars({
  data,
  caption,
}: {
  readonly data: readonly Bucket[];
  readonly caption: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]!);

  return (
    <figure className="rounded-2xl border border-border-subtle bg-surface p-5 sm:p-6">
      <figcaption className="font-display text-base font-extrabold text-brand-primary">
        {caption}
      </figcaption>

      <div className="relative mt-6 h-[230px]">
        {/* Rejilla: cuatro líneas finas, una sombra por encima del fondo. */}
        {[0, 25, 50, 75, 100].map((p) => (
          <div
            key={p}
            className="absolute inset-x-0 border-t border-border-subtle"
            style={{ bottom: `${p}%` }}
            aria-hidden="true"
          />
        ))}

        <ol className="absolute inset-0 flex items-end gap-[3px]">
          {data.map((d) => {
            const isPeak = d.value === peak.value && d.value > 0;
            return (
              <li key={d.label} className="group relative flex h-full flex-1 items-end">
                {/* La barra se ancla a la línea base y sólo redondea
                    arriba: el extremo redondo marca el final del dato. */}
                <div
                  tabIndex={0}
                  role="img"
                  aria-label={`${d.label}: ${d.value} requests, ${d.percent.toFixed(1)} percent`}
                  className="mx-auto w-full max-w-[30px] rounded-t-[4px] bg-brand-primary transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary-deep"
                  style={{ height: `${Math.max((d.value / max) * BAR_CEILING, d.value > 0 ? 2 : 0)}%` }}
                />

                {/* Sólo el máximo lleva número encima. Un valor sobre
                    cada barra se convierte en ruido y no lo lee nadie. */}
                {isPeak && (
                  <span
                    className="pointer-events-none absolute inset-x-0 text-center text-xs font-bold tabular-nums text-brand-primary"
                    style={{ bottom: `calc(${(d.value / max) * BAR_CEILING}% + 6px)` }}
                  >
                    {d.value}
                  </span>
                )}

                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-text-primary px-2.5 py-1.5 text-xs font-semibold text-white group-hover:block group-focus-within:block">
                  {d.label} · {d.value} · {d.percent.toFixed(1)}%
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-2 flex gap-[3px]" aria-hidden="true">
        {data.map((d) => (
          <span
            key={d.label}
            className="flex-1 text-center text-[0.68rem] font-semibold text-text-secondary"
          >
            {d.label}
          </span>
        ))}
      </div>

      <ValueTable
        data={data}
        head={["Month", "Requests", "Share"]}
        summary="Same numbers as the chart above"
      />
    </figure>
  );
}

/** Barras horizontales ordenadas de mayor a menor. Para los rankings. */
export function RankBars({
  data,
  caption,
  unitLabel,
  emptyText = "No data yet.",
}: {
  readonly data: readonly Bucket[];
  readonly caption: string;
  readonly unitLabel: string;
  readonly emptyText?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <figure className="rounded-2xl border border-border-subtle bg-surface p-5 sm:p-6">
      <figcaption className="font-display text-base font-extrabold text-brand-primary">
        {caption}
      </figcaption>

      {data.length === 0 ? (
        <p className="mt-4 text-sm text-text-secondary">{emptyText}</p>
      ) : (
        /* Cada fila lleva su cifra y su porcentaje al lado: la barra
           ordena de un vistazo, el número da la precisión. Esta lista ya
           es su propia tabla, así que no se repite debajo. */
        <ul className="mt-5 space-y-3.5">
          {data.map((d) => (
            <li key={d.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold">{d.label}</span>
                <span className="shrink-0 tabular-nums text-text-secondary">
                  <strong className="text-text-primary">{d.value}</strong> {unitLabel} ·{" "}
                  {d.percent.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-background">
                <div
                  className="h-2 rounded-r-[4px] bg-brand-secondary-deep"
                  style={{ width: `${Math.max((d.value / max) * 100, 1.5)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

/**
 * Una cifra sola. Cuando la historia es un número, una barra única no
 * añade nada: el número ES la gráfica.
 *
 * Sin `tabular-nums`: a tamaño grande, los dígitos de ancho fijo dejan
 * huecos y el número se lee suelto.
 */
export function StatTile({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
        {label}
      </p>
      <p className="mt-1.5 text-3xl font-extrabold leading-none text-brand-primary">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-sm text-text-secondary">{hint}</p>}
    </div>
  );
}

/** La tabla gemela de una gráfica: los mismos datos, sin color. */
function ValueTable({
  data,
  head,
  summary,
}: {
  readonly data: readonly Bucket[];
  readonly head: readonly [string, string, string];
  readonly summary: string;
}) {
  return (
    <details className="mt-5 border-t border-border-subtle pt-3">
      <summary className="cursor-pointer text-sm font-bold text-brand-primary">
        Show the numbers
      </summary>
      <table className="mt-3 w-full border-collapse text-sm">
        <caption className="sr-only">{summary}</caption>
        <thead>
          <tr className="border-b border-border-subtle text-left">
            {head.map((h, i) => (
              <th key={h} className={`py-1.5 font-bold ${i > 0 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label} className="border-b border-border-subtle last:border-0">
              <td className="py-1.5">{d.label}</td>
              <td className="py-1.5 text-right tabular-nums">{d.value}</td>
              <td className="py-1.5 text-right tabular-nums text-text-secondary">
                {d.percent.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
