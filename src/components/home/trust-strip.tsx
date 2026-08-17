import { useTranslations } from "next-intl";
import { BRAND, LOCATIONS } from "@/config/site";

/**
 * Cifras verificadas por el dueño (ago. 2026). Ninguna es estimación:
 * si un dato no está confirmado, no aparece aquí.
 */
export function TrustStrip() {
  const t = useTranslations("home.trust");
  const years = new Date().getFullYear() - BRAND.foundedYear;
  const active = LOCATIONS.filter((l) => l.active).length;

  const items = [
    { value: t("yearsValue", { years }), label: t("yearsLabel", { year: BRAND.foundedYear }) },
    { value: BRAND.patientsServed.toLocaleString("en-US"), label: t("patientsLabel") },
    { value: String(active), label: t("officesLabel") },
    { value: "EN / ES", label: t("languagesLabel") },
  ];

  return (
    <section className="border-y border-border-subtle bg-surface">
      <div className="mx-auto grid w-[92%] max-w-[1200px] gap-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="border-l-[3px] border-brand-secondary-tint pl-4">
            <p className="font-display text-2xl font-bold leading-tight text-brand-primary">
              {it.value}
            </p>
            <p className="mt-1 text-sm text-text-secondary">{it.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
