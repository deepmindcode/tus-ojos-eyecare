import { redirect } from "next/navigation";
import { getAdminUser, can } from "@/lib/auth/roles";
import { listPromotions, manzanitoSettings } from "./actions";
import { PromotionManager } from "@/components/admin/promotion-manager";
import { MascotSwitch } from "@/components/admin/mascot-switch";
import { LOCATIONS } from "@/config/site";

/**
 * src/app/(admin)/admin/(protected)/offers/page.tsx
 *
 * Panel de promociones. Wilfredo crea la oferta, elige si vale para una
 * sede o para las tres, y la publica. Lo que escribe en "descuento" es
 * exactamente lo que recepción verá en la ficha de la cita.
 */

export const metadata = { title: "Promociones" };

export default async function OffersPage() {
  const user = await getAdminUser();

  // El panel no se enlaza en público, pero la puerta se cierra igual aquí:
  // middleware y RBAC son dos capas, no una.
  if (!user) redirect("/admin/login");
  if (!can(user, "offers:create")) redirect("/admin");

  const [promotions, mascot] = await Promise.all([listPromotions(), manzanitoSettings()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-primary sm:text-3xl">
          Promociones
        </h1>
        <p className="mt-2 max-w-2xl text-[0.95rem] text-text-secondary">
          Las promociones activas aparecen como ventana emergente en el sitio.
          Cuando el visitante acepta, llega al formulario de cita con el
          descuento ya anotado: la sede verá qué se le prometió antes de
          llamarlo.
        </p>
      </header>

      {/* Solo direccion: encenderlo cambia lo que ve todo visitante. */}
      {can(user, "mascot:manage") && (
        <MascotSwitch initial={mascot.enabled} initialFrequency={mascot.frequency} />
      )}

      <PromotionManager
        initialPromotions={promotions}
        locations={LOCATIONS.filter((l) => l.active).map((l) => ({
          slug: l.slug,
          name: l.city,
        }))}
        canPublish={can(user, "offers:publish")}
      />
    </div>
  );
}