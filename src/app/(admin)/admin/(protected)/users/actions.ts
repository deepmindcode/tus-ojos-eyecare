"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminUser, can, ROLES, type Role } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";

/**
 * Gestión del equipo.
 *
 * Estas acciones SÍ usan service_role, porque crear usuarios requiere la
 * API de administración de Supabase Auth. Por eso cada una vuelve a
 * comprobar el permiso al principio: aquí no hay red de seguridad de RLS.
 */

/** Suspensión larga: Supabase no tiene "para siempre", 100 años basta. */
const FOREVER = "876000h";

export interface StaffMember {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly string[];
  readonly locations: readonly string[];
  /** Falso si la cuenta está desactivada y no puede entrar. */
  readonly active: boolean;
}

async function requireUserAdmin() {
  const user = await getAdminUser();
  if (!can(user, "users:manage")) return null;
  return user;
}

export async function listStaff(): Promise<StaffMember[]> {
  if (!(await requireUserAdmin())) return [];

  const supabase = createSupabaseAdminClient();

  const [profiles, roles, locs, authUsers] = await Promise.all([
    supabase.from("staff_profiles").select("user_id, display_name, email"),
    supabase.from("user_roles").select("user_id, roles(name)"),
    supabase.from("user_locations").select("user_id, locations(city)"),
    // El estado de la cuenta vive en Auth, no en nuestras tablas: una
    // cuenta suspendida no puede entrar aunque conserve sus roles.
    supabase.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);

  const banned = new Set(
    (authUsers.data?.users ?? [])
      .filter((u) => {
        const until = (u as unknown as { banned_until?: string | null }).banned_until;
        return Boolean(until) && new Date(until!).getTime() > Date.now();
      })
      .map((u) => u.id),
  );

  const byUser = new Map<string, StaffMember>();

  for (const p of profiles.data ?? []) {
    const id = p.user_id as string;
    byUser.set(id, {
      userId: id,
      email: p.email as string,
      displayName: p.display_name as string,
      roles: [],
      locations: [],
      active: !banned.has(id),
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

  return [...byUser.values()].sort((a, b) => {
    // Las desactivadas al final: estorban menos y se ven igual.
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });
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

/**
 * Activa o desactiva una cuenta.
 *
 * Desactivar, no borrar. La auditoría apunta a estos usuarios: borrar a
 * alguien dejaría registros huérfanos de quién abrió qué expediente, y
 * eso es justo lo que la auditoría existe para evitar.
 *
 * Dos cerrojos: nadie se desactiva a sí mismo (te quedas fuera de tu
 * propio panel), y no se puede dejar al negocio sin ninguna cuenta de
 * dirección activa.
 */
export async function setStaffActive(userId: string, active: boolean) {
  const admin = await requireUserAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };
  if (userId === admin.id) return { ok: false as const, error: "cannotSelf" };

  const supabase = createSupabaseAdminClient();

  if (!active) {
    const staff = await listStaff();
    const leadershipLeft = staff.filter(
      (m) =>
        m.active &&
        m.userId !== userId &&
        m.roles.some((r) => r === "OWNER" || r === "SUPER_ADMIN"),
    );
    if (leadershipLeft.length === 0) {
      return { ok: false as const, error: "lastOwner" };
    }
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : FOREVER,
  });

  if (error) {
    console.error("[admin] fallo cambiando estado de la cuenta:", error);
    return { ok: false as const, error: "server" };
  }

  after(async () => {
    await logAudit({
      userId: admin.id,
      action: active ? "user.reactivated" : "user.deactivated",
      objectType: "user",
      objectId: userId,
    });
  });

  revalidatePath("/admin/users");
  return { ok: true as const };
}

/**
 * Pone una contraseña temporal a otra persona.
 *
 * Se devuelve para enseñarla UNA vez en pantalla; no se envía por correo
 * por la misma razón que al crear la cuenta. Cierra todas las sesiones
 * abiertas de esa persona: si alguien olvidó la contraseña porque le
 * robaron el portátil, dejar su sesión viva no arreglaría nada.
 */
export async function resetStaffPassword(userId: string, newPassword: string) {
  const admin = await requireUserAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };
  if (newPassword.length < 12) return { ok: false as const, error: "weakPassword" };

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    console.error("[admin] fallo reiniciando contraseña:", error);
    return { ok: false as const, error: "server" };
  }

  // Fuera todas sus sesiones: la contraseña vieja ya no vale, y una
  // sesión abierta con la vieja tampoco debería.
  await supabase.auth.admin.signOut(userId, "global").catch(() => {
    // Si no hay sesiones que cerrar, no es un error.
  });

  after(async () => {
    await logAudit({
      userId: admin.id,
      action: "user.password_reset",
      objectType: "user",
      objectId: userId,
    });
  });

  return { ok: true as const };
}

/**
 * Cambiar la contraseña propia. Cualquiera del equipo, no solo dirección.
 *
 * Se comprueba la actual antes de cambiarla. Sin eso, una sesión robada
 * bastaría para quedarse con la cuenta: el ladrón pondría su propia
 * contraseña y el dueño quedaría fuera.
 */
export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const user = await getAdminUser();
  if (!user) return { ok: false as const, error: "forbidden" };
  if (newPassword.length < 12) return { ok: false as const, error: "weakPassword" };
  if (currentPassword === newPassword) return { ok: false as const, error: "samePassword" };

  const supabase = await createSupabaseServerClient();

  const { data: me } = await supabase.auth.getUser();
  const email = me.user?.email;
  if (!email) return { ok: false as const, error: "forbidden" };

  const { error: checkError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (checkError) return { ok: false as const, error: "wrongPassword" };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    console.error("[admin] fallo cambiando contraseña propia:", error);
    return { ok: false as const, error: "server" };
  }

  after(async () => {
    await logAudit({
      userId: user.id,
      action: "user.password_changed",
      objectType: "user",
      objectId: user.id,
    });
  });

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