import { redirect } from "next/navigation";
import { getAdminUser, can } from "@/lib/auth/roles";
import { listStaff } from "./actions";
import { TeamManager } from "@/components/admin/team-manager";
import { LOCATIONS } from "@/config/site";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getAdminUser();
  if (!can(user, "users:manage")) redirect("/admin");

  const staff = await listStaff();

  return (
    <>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-primary">
        Team
      </h1>
      <p className="mt-1 max-w-[70ch] text-sm text-text-secondary">
        Front desk accounts only see requests for the offices assigned to them. Owners and
        managers see all three.
      </p>

      <div className="mt-6">
        <TeamManager
          staff={staff}
          offices={LOCATIONS.filter((l) => l.active).map((l) => ({
            slug: l.slug,
            city: l.city,
          }))}
          currentUserId={user!.id}
        />
      </div>
    </>
  );
}
