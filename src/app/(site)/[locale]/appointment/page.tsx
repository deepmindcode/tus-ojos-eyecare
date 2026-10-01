import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { AlertTriangle, Tag } from "lucide-react";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { resolvePromotion } from "@/lib/promotions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "appointment" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    // La página de solicitud no se indexa: lo que Google debe posicionar
    // son las páginas de servicio y ubicación, que llevan hasta aquí.
    robots: { index: false, follow: true },
  };
}

export default async function AppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ promo?: string }>;
}) {
  const [{ locale }, { promo: promoSlug }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations("appointment");
  const isES = locale === "es";

  // La promoción se resuelve contra la base, no desde la URL. Un slug
  // inventado no produce descuento: produce null, y el formulario sigue
  // como si nadie hubiera venido de un popup.
  const promo = await resolvePromotion(promoSlug, locale);

  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto w-[92%] max-w-[720px]">
        <h1 className="font-display text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold leading-tight tracking-[-0.03em] text-brand-primary">
          {t("heading")}
        </h1>
        <p className="mt-3 text-[1.05rem] text-text-secondary">{t("intro")}</p>

        {/* Promoción aceptada: se muestra lo que se va a pedir, para que
            nadie llegue al mostrador creyendo otra cosa. */}
        {promo && (
          <div className="mt-6 rounded-2xl border border-brand-secondary/40 bg-brand-secondary-tint p-5">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-brand-secondary-deep">
              <Tag className="size-3.5" aria-hidden="true" />
              {isES ? "Promoción aplicada" : "Offer applied"}
            </p>

            <p className="mt-3 font-display text-lg font-bold text-brand-primary">
              {promo.discountLabel ?? promo.title}
            </p>

            <p className="mt-2 text-[0.9rem] text-text-secondary">
              {isES
                ? "La oficina verá este descuento en tu solicitud y lo confirmará cuando te llame."
                : "The office will see this discount on your request and confirm it when they call."}
            </p>

            {promo.terms && (
              <p className="mt-3 text-xs leading-relaxed text-text-secondary">{promo.terms}</p>
            )}
          </div>
        )}

        <p className="mt-5 flex gap-3 rounded-r-xl border-l-4 border-error bg-[#FDF0F0] p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-error" aria-hidden="true" />
          <span>
            <strong className="text-error">{t("emergencyStrong")}</strong> {t("emergencyRest")}
          </span>
        </p>

        <div className="mt-8">
          <AppointmentForm
            promoSlug={promo?.slug}
            lockedLocationSlug={promo?.lockedLocationSlug ?? undefined}
          />
        </div>
      </div>
    </section>
  );
}