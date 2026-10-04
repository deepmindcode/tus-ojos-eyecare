/**
 * src/lib/office-time.ts
 *
 * La hora tal y como la lee el mostrador.
 *
 * El servidor de Vercel corre en UTC. Si una hora se formatea sin zona,
 * recepción en Camden ve las 13:32 cuando en el reloj de la pared son
 * las 09:32, y deja de fiarse de la pantalla.
 */

const OFFICE_TIME_ZONE = "America/New_York";

const CLOCK = new Intl.DateTimeFormat("en-US", {
  timeZone: OFFICE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

/** Hora local de las sedes, p. ej. "09:32 AM". */
export function officeClock(date: Date = new Date()): string {
  return CLOCK.format(date);
}
