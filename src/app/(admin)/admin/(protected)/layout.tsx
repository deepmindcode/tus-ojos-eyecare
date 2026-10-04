import { redirect } from "next/navigation";
import { getAdminUser, primaryRole, can } from "@/lib/auth/roles";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * Layout del subárbol PROTEGIDO del panel.
 *
 * Aquí vive la autorización real. El middleware sólo mira si hay cookie
 * de sesión; esta comprobación valida el JWT contra Supabase y exige que
 * la persona tenga al menos un rol asignado. Un usuario que se registre
 * por su cuenta queda fuera aunque consiga iniciar sesión.
 *
 * Ir por capas es deliberado: si el middleware se saltara —como ocurrió
 * con CVE-2025-29927 en Next.js— este layout sigue bloqueando, y por
 * debajo las políticas RLS siguen negando los datos.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  return (
    <AdminShell
      email={user.email}
      role={primaryRole(user)}
      canSeeAudit={can(user, "audit:read")}
      canManageUsers={can(user, "users:manage")}
      canManageOffers={can(user, "offers:create")}
      canSeeClients={can(user, "clients:read")}
      canSeeTrends={can(user, "metrics:read")}
      canSeeCampaigns={can(user, "campaigns:manage")}
    >
      {children}
    </AdminShell>
  );
}
