import { useTranslations } from "next-intl";
import { Phone, MessageSquare, CalendarDays } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LOCATIONS } from "@/config/site";

/**
 * CTA fija inferior en móvil (§39). No cubre contenido: el layout
 * reserva padding-bottom equivalente. Objetivos táctiles de 44px.
 *
 * El teléfono por defecto es el de la sede principal. En las páginas de
 * ubicación se sobreescribe con el de esa oficina.
 */
export function MobileCTA({ locationId }: { readonly locationId?: string }) {
  const t = useTranslations("common");
  const loc = LOCATIONS.find((l) => l.id === locationId) ?? LOCATIONS.find((l) => l.isPrincipal)!;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-border-subtle bg-surface/95 p-2 backdrop-blur lg:hidden">
      <a
        href={`tel:${loc.phoneE164}`}
        className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-border-subtle bg-surface text-sm font-bold text-brand-secondary-deep"
      >
        <Phone className="size-4" aria-hidden="true" />
        {t("call")}
      </a>
      <a
        href={`sms:${loc.smsE164}`}
        className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-border-subtle bg-surface text-sm font-bold text-brand-secondary-deep"
      >
        <MessageSquare className="size-4" aria-hidden="true" />
        {t("text")}
      </a>
      <Link
        href="/appointment"
        className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-primary text-sm font-bold text-white"
      >
        <CalendarDays className="size-4" aria-hidden="true" />
        {t("scheduleShort")}
      </Link>
    </div>
  );
}
