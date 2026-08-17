import { LOCATIONS, BRAND } from "@/config/site";
import { LanguageSwitcher } from "./language-switcher";

/**
 * Barra superior con teléfonos directos. En móvil se ocultan los
 * teléfonos (los cubre la barra fija inferior) y queda sólo el idioma.
 */
export function UtilityBar() {
  return (
    <div className="bg-brand-primary text-white">
      <div className="mx-auto flex w-[92%] max-w-[1200px] flex-wrap items-center justify-between gap-3 py-2 text-sm">
        <div className="hidden flex-wrap items-center gap-5 md:flex">
          {LOCATIONS.filter((l) => l.active).map((l) => (
            <a key={l.id} href={`tel:${l.phoneE164}`} className="hover:underline">
              {l.city} {l.phone}
            </a>
          ))}
          <a href={`mailto:${BRAND.email}`} className="hover:underline">
            {BRAND.email}
          </a>
        </div>
        <div className="ml-auto">
          <LanguageSwitcher variant="dark" />
        </div>
      </div>
    </div>
  );
}
