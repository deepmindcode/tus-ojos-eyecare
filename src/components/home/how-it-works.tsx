import { useTranslations } from "next-intl";
import { AlertTriangle, Info } from "lucide-react";

/**
 * Cómo funciona pedir cita. Los dos avisos del final no son adorno:
 *
 * - "tu cita no está confirmada" es exigencia del §17: enviar el
 *   formulario NO reserva nada, y decirlo aquí evita que alguien se
 *   presente en la oficina creyendo que tiene hora.
 * - El aviso de emergencias es §16: la web no es un canal de urgencias.
 */
export function HowItWorks() {
  const t = useTranslations("home.steps");

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto w-[92%] max-w-[1200px]">
        <div className="mb-10 max-w-[62ch]">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-secondary-deep">
            <span className="size-3 shrink-0 rounded-full border-[3px] border-brand-secondary" aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h2 className="font-display text-[clamp(1.7rem,3.4vw,2.5rem)] font-bold leading-tight tracking-[-0.028em]">
            {t("heading")}
          </h2>
        </div>

        <ol className="grid gap-8 lg:grid-cols-3">
          {["one", "two", "three"].map((k, i) => (
            <li key={k} className="relative pl-14">
              <span
                className="absolute left-0 top-0 grid size-9 place-items-center rounded-full bg-brand-primary-tint font-display text-lg font-extrabold text-brand-primary"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <h3 className="font-display text-[1.12rem] font-bold tracking-[-0.015em]">
                {t(`${k}.title`)}
              </h3>
              <p className="mt-1.5 text-[0.96rem] text-text-secondary">{t(`${k}.body`)}</p>
            </li>
          ))}
        </ol>

        <p className="mt-12 flex max-w-[72ch] gap-3 rounded-r-xl border-l-4 border-brand-primary bg-brand-primary-tint p-5 text-[0.96rem]">
          <Info className="mt-0.5 size-5 shrink-0 text-brand-primary" aria-hidden="true" />
          <span>
            <strong className="text-brand-primary">{t("noticeStrong")}</strong> {t("noticeRest")}
          </span>
        </p>

        <p className="mt-4 flex max-w-[72ch] gap-3 rounded-r-xl border-l-4 border-error bg-[#FDF0F0] p-5 text-[0.94rem]">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-error" aria-hidden="true" />
          <span>
            <strong className="text-error">{t("emergencyStrong")}</strong> {t("emergencyRest")}
          </span>
        </p>
      </div>
    </section>
  );
}
