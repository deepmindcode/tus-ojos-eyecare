"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAdminUser, can, ROLES, type Role } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";

/**
 * Gestión del equipo.
 *
 * Estas acciones SÍ usan service_role, porque crear usuarios requiere la
 * API de administración de Supabase Auth. Por eso cada una vuelve a
 * comprobar el permiso al principio: aquí no hay red de seguridad de RLS.
 */

export interface StaffMember {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly string[];
  readonly locations: readonly string[];
}

async function requireUserAdmin() {
  const user = await getAdminUser();
  if (!can(user, "users:manage")) return null;
  return user;
}

export async function listStaff(): Promise<StaffMember[]> {
  if (!(await requireUserAdmin())) return [];

  const supabase = createSupabaseAdminClient();

  const [profiles, roles, locs] = await Promise.all([
    supabase.from("staff_profiles").select("user_id, display_name, email"),
    supabase.from("user_roles").select("user_id, roles(name)"),
    supabase.from("user_locations").select("user_id, locations(city)"),
  ]);

  const byUser = new Map<string, StaffMember>();

  for (const p of profiles.data ?? []) {
    byUser.set(p.user_id as string, {
      userId: p.user_id as string,
      email: p.email as string,
      displayName: p.display_name as string,
      roles: [],
      locations: [],
    });
  }

  for (const r of roles.data ?? []) {
    const m = byUser.get(r.user_id as string);
    const name = (r.roles as unknown as { name: string } | null)?.name;
    if (m && name) byUser.set(m.userId, { ...m, roles: [...m.roles, name] });
  }

  for (const l of locs.data ?? []) {
    const m = byUser.get(l.user_id as string);
    const city = (l.locations as unknown as { city: string } | null)?.city;
    if (m && city) byUser.set(m.userId, { ...m, locations: [...m.locations, city] });
  }

  return [...byUser.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Crea una cuenta de personal.
 *
 * No enviamos la contraseña por correo ni la mostramos dos veces: se
 * enseña UNA vez al crear, y quien la crea la entrega en persona. Un
 * correo con credenciales queda para siempre en un buzón.
 */
export async function createStaff(input: {
  email: string;
  displayName: string;
  password: string;
  role: Role;
  locationSlugs: string[];
}) {
  const admin = await requireUserAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };

  if (!ROLES.includes(input.role)) return { ok: false as const, error: "invalidRole" };
  if (input.password.length < 12) return { ok: false as const, error: "weakPassword" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) {
    return { ok: false as const, error: "invalidEmail" };
  }

  const supabase = createSupabaseAdminClient();

  const { data: created, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (authError || !created.user) {
    console.error("[admin] fallo creando usuario:", authError);
    return {
      ok: false as const,
      error: authError?.message.includes("already") ? "emailTaken" : "server",
    };
  }

  const userId = created.user.id;

  await supabase.from("staff_profiles").insert({
    user_id: userId,
    display_name: input.displayName.trim(),
    email: input.email,
  });

  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("name", input.role)
    .single();

  if (role) {
    await supabase.from("user_roles").insert({
      user_id: userId,
      role_id: role.id,
      assigned_by: admin.id,
    });
  }

  await assignLocationRows(userId, input.locationSlugs, admin.id);

  after(async () => {
    await logAudit({
      userId: admin.id,
      action: "user.created",
      objectType: "user",
      objectId: userId,
      details: { role: input.role, offices: input.locationSlugs.join(",") || "none" },
    });
  });

  revalidatePath("/admin/users");
  return { ok: true as const };
}

export async function setStaffLocations(userId: string, locationSlugs: string[]) {
  const admin = await requireUserAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };

  const supabase = createSupabaseAdminClient();
  await supabase.from("user_locations").delete().eq("user_id", userId);
  await assignLocationRows(userId, locationSlugs, admin.id);

  after(async () => {
    await logAudit({
      userId: admin.id,
      action: "user.locations_changed",
      objectType: "user",
      objectId: userId,
      details: { offices: locationSlugs.join(",") || "none" },
    });
  });

  revalidatePath("/admin/users");
  return { ok: true as const };
}

async function assignLocationRows(userId: string, slugs: string[], assignedBy: string) {
  if (slugs.length === 0) return;
  const supabase = createSupabaseAdminClient();

  const { data: locations } = await supabase
    .from("locations")
    .select("id, slug")
    .in("slug", slugs);

  if (!locations?.length) return;

  await supabase.from("user_locations").insert(
    locations.map((l) => ({
      user_id: userId,
      location_id: l.id,
      assigned_by: assignedBy,
    })),
  );
}
