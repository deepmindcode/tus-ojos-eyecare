import { CheckCircle2, XCircle } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { readUnsubscribeToken } from "@/lib/campaigns/token";
import { BRAND } from "@/config/site";

/**
 * src/app/unsubscribe/page.tsx
 *
 * La baja ocurre al ABRIR la página, sin pedir confirmación.
 *
 * Es deliberado y va contra la costumbre. Un segundo paso ("confirma que
 * quieres darte de baja") pierde a gente que creía haberse dado de baja y
 * sigue recibiendo correo, y eso termina en una denuncia por spam, que
 * hace mucho más daño al dominio que perder un contacto. Si alguien llega
 * aquí por error, volver a escribirnos cuesta menos que el camino
 * contrario.
 *
 * Escribe con service_role porque quien se da de baja no tiene sesión.
 * Lo único que puede hacer esta ruta es insertar un correo cuya firma
 * cuadre, así que no hay nada que un visitante pueda forzar.
 */

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const email = t ? readUnsubscribeToken(t) : null;

  if (email) {
    const supabase = createSupabaseAdminClient();
    await supabase
      .from("email_unsubscribes")
      .upsert({ email, source: "link" }, { onConflict: "email" });
  }

  const ok = Boolean(email);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
      <div className="rounded-2xl border border-border-subtle bg-surface p-7">
        <p className="font-display text-xl font-extrabold text-brand-primary">
          {BRAND.name}
        </p>

        {ok ? (
          <>
            <h1 className="mt-6 flex items-start gap-2.5 font-display text-2xl font-extrabold tracking-tight">
              <CheckCircle2 className="mt-1 size-6 shrink-0 text-brand-secondary-deep" aria-hidden="true" />
              Listo, no recibirás más correos
            </h1>
            <p className="mt-3 text-text-secondary">
              Hemos dado de baja <strong className="text-text-primary">{email}</strong>.
              No te enviaremos más ofertas ni avisos a esa dirección.
            </p>
            <p className="mt-4 text-[0.95rem] text-text-secondary">
              Esto no cancela ninguna cita. Si tienes una pedida, seguimos
              llamándote por teléfono como siempre.
            </p>

            <hr className="my-6 border-border-subtle" />

            <h2 className="font-display text-lg font-extrabold">You are unsubscribed</h2>
            <p className="mt-2 text-text-secondary">
              We removed <strong className="text-text-primary">{email}</strong> from
              our mailing list. This does not cancel any appointment.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 flex items-start gap-2.5 font-display text-2xl font-extrabold tracking-tight">
              <XCircle className="mt-1 size-6 shrink-0 text-error" aria-hidden="true" />
              Este enlace no es válido
            </h1>
            <p className="mt-3 text-text-secondary">
              Puede que esté incompleto por cómo lo cortó tu programa de correo.
              Prueba a abrirlo desde el correo original, o escríbenos a{" "}
              <a href={`mailto:${BRAND.email}`} className="font-semibold text-brand-primary underline">
                {BRAND.email}
              </a>{" "}
              y te damos de baja a mano.
            </p>
            <p className="mt-4 text-[0.95rem] text-text-secondary">
              This link is not valid. Email us and we will remove you by hand.
            </p>
          </>
        )}

        <p className="mt-7 border-t border-border-subtle pt-4 text-xs leading-relaxed text-text-secondary">
          {BRAND.corporate.legalEntity} · {BRAND.corporate.addressLine1},{" "}
          {BRAND.corporate.city}, {BRAND.corporate.state} {BRAND.corporate.postalCode}
        </p>
      </div>
    </main>
  );
}
