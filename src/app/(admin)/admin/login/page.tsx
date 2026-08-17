import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/roles";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Sign in · Tus Ojos Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  // Si ya hay sesión con rol, no tiene sentido mostrar el login.
  const user = await getAdminUser();
  if (user) redirect("/admin");

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <LoginForm />
        <p className="mt-6 text-center text-xs text-text-secondary">
          Authorized personnel only. All access is logged.
        </p>
      </div>
    </main>
  );
}
