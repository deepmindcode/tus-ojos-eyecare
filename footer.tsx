import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LogoLockup } from "@/components/brand/logo";
import { BRAND, LOCATIONS } from "@/config/site";
import { FOOTER_CARE, FOOTER_PATIENTS, FOOTER_LEGAL } from "@/config/navigation";

/**
 * Pie de página (§40). Sin enlace a /admin: el panel no se anuncia
 * públicamente. Etiquetas profesionales, nunca "Enlaces útiles".
 */
/**
 * Iconos de redes en SVG propio.
 * lucide-react retiró los iconos de marca (Facebook, Instagram, YouTube)
 * por motivos de marca registrada, así que los dibujamos aquí.
 */
function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1Z" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-4"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconYoutube() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M22 12c0-2.5-.2-3.7-.5-4.3-.3-.6-.9-1-1.6-1.1C18.4 6.3 12 6.3 12 6.3s-6.4 0-7.9.3c-.7.1-1.3.5-1.6 1.1C2.2 8.3 2 9.5 2 12s.2 3.7.5 4.3c.3.6.9 1 1.6 1.1 1.5.3 7.9.3 7.9.3s6.4 0 7.9-.3c.7-.1 1.3-.5 1.6-1.1.3-.6.5-1.8.5-4.3Zm-12 3V9l5 3-5 3Z" />
    </svg>
  );
}

export function Footer() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#242726] pb-8 pt-14 text-[0.92rem] text-[#B3BFBC]">
      <div className="mx-auto w-[92%] max-w-[1200px]">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <div>
            <LogoLockup variant="dark" />
            <p className="mt-4 max-w-[34ch]">{t("blurb")}</p>
            <p className="mt-3">
              <a href={`mailto:${BRAND.email}`} className="hover:text-white hover:underline">
                {BRAND.email}
              </a>
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href={BRAND.social.facebook}
                aria-label="Facebook"
                className="grid size-9 place-items-center rounded-full border border-[#3E4643] hover:border-[#8FC4BE] hover:text-[#8FC4BE]"
              >
                <IconFacebook />
              </a>
              <a
                href={BRAND.social.instagram}
                aria-label="Instagram"
                className="grid size-9 place-items-center rounded-full border border-[#3E4643] hover:border-[#8FC4BE] hover:text-[#8FC4BE]"
              >
                <IconInstagram />
              </a>
              <a
                href={BRAND.social.youtube}
                aria-label="YouTube"
                className="grid size-9 place-items-center rounded-full border border-[#3E4643] hover:border-[#8FC4BE] hover:text-[#8FC4BE]"
              >
                <IconYoutube />
              </a>
            </div>
          </div>

          <FooterColumn title={t("careTitle")}>
            {FOOTER_CARE.map((i) => (
              <li key={i.key}>
                <Link href={i.href} className="hover:text-white hover:underline">
                  {tn(i.key)}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title={t("patientsTitle")}>
            {FOOTER_PATIENTS.map((i) => (
              <li key={i.key}>
                <Link href={i.href} className="hover:text-white hover:underline">
                  {tn(i.key)}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title={t("locationsTitle")}>
            {LOCATIONS.filter((l) => l.active).map((l) => (
              <li key={l.id}>
                <a href={`tel:${l.phoneE164}`} className="hover:text-white hover:underline">
                  {l.city}, {l.state}
                </a>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title={t("legalTitle")}>
            {FOOTER_LEGAL.map((i) => (
              <li key={i.key}>
                <Link href={i.href} className="hover:text-white hover:underline">
                  {t(i.key)}
                </Link>
              </li>
            ))}
          </FooterColumn>
        </div>

        {/* Dirección corporativa principal: exigida en avisos legales
            y en el pie de los correos comerciales. */}
        <address className="mt-10 not-italic text-[0.82rem] text-[#7E8C88]">
          {BRAND.corporate.legalEntity} · {BRAND.corporate.addressLine1},{" "}
          {BRAND.corporate.city}, {BRAND.corporate.state} {BRAND.corporate.postalCode},{" "}
          {BRAND.corporate.country}
        </address>

        <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-[#3A403E] pt-5 text-[0.8rem] text-[#7E8C88]">
          <span>
            © {year} {t("rights")}
          </span>
          <span>{t("disclaimer")}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-3 font-display text-[0.75rem] uppercase tracking-[0.15em] text-white">
        {title}
      </h2>
      <ul className="flex flex-col gap-2">{children}</ul>
    </div>
  );
}
