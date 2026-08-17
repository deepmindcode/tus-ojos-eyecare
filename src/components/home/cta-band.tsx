import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function CtaBand() {
  const t = useTranslations("home.cta");
  const tc = useTranslations("common");

  return (
    <section className="bg-brand-primary text-white">
      <div className="mx-auto flex w-[92%] max-w-[1200px] flex-wrap items-center justify-between gap-8 py-14">
        <div>
          <h2 className="max-w-[18ch] font-display text-[clamp(1.7rem,3.4vw,2.5rem)] font-bold leading-tight tracking-[-0.028em]">
            {t("heading")}
          </h2>
          <p className="mt-3 max-w-[42ch] text-[#E7D3E7]">{t("body")}</p>
        </div>
        <Link
          href="/appointment"
          className="inline-flex min-h-11 items-center rounded-full bg-white px-6 font-bold text-brand-primary hover:bg-brand-primary-tint"
        >
          {tc("schedule")}
        </Link>
      </div>
    </section>
  );
}
