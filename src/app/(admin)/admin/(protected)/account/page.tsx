import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { getAdminUser } from "@/lib/auth/roles";
import { ChangePasswordForm } from "@/components/admin/change-password-form";

/**
 * src/app/(admin)/admin/(protected)/account/page.tsx
 *
 * La cuenta propia. Sin permisos especiales: si estas dentro del panel,
 * puedes cambiar tu contrasena. Quien olvido la suya y no puede entrar
 * se la pide a direccion, que genera una temporal desde /admin/users.
 */

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  return (
    <>
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-brand-primary">
          <KeyRound className="size-6" aria-hidden="true" />
          Your account
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Signed in as {user.email}
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-border-subtle bg-surface p-6">
        <h2 className="font-display text-lg font-bold">Change your password</h2>
        <p className="mt-1 text-sm text-text-secondary">
          If you forgot it and cannot sign in, ask an owner to set a temporary one for you.
        </p>

        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </div>
    </>
  );
}