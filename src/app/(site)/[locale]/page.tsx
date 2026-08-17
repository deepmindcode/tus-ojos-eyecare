import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/hero";
import { TrustStrip } from "@/components/home/trust-strip";
import { ServicesPreview } from "@/components/home/services-preview";
import { LocationsGrid } from "@/components/locations/locations-grid";
import { HowItWorks } from "@/components/home/how-it-works";
import { CtaBand } from "@/components/home/cta-band";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero locale={locale} />
      <TrustStrip />
      <ServicesPreview />
      <LocationsGrid locale={locale} />
      <HowItWorks />
      <CtaBand />
    </>
  );
}
