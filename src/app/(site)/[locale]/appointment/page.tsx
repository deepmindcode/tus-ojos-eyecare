import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { AppointmentForm } from "@/components/forms/appointment-form";

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
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("appointment");

  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto w-[92%] max-w-[720px]">
        <h1 className="font-display text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold leading-tight tracking-[-0.03em] text-brand-primary">
          {t("heading")}
        </h1>
        <p className="mt-3 text-[1.05rem] text-text-secondary">{t("intro")}</p>

        <p className="mt-5 flex gap-3 rounded-r-xl border-l-4 border-error bg-[#FDF0F0] p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-error" aria-hidden="true" />
          <span>
            <strong className="text-error">{t("emergencyStrong")}</strong> {t("emergencyRest")}
          </span>
        </p>

        <div className="mt-8">
          <AppointmentForm />
        </div>
      </div>
    </section>
  );
}
