import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Roles y permisos del panel.
 *
 * Esta es la autorización REAL. El middleware sólo comprueba que exista
 * sesión y redirige al login; aquí se decide qué puede hacer cada
 * persona. Y por debajo de todo esto siguen las políticas RLS, que
 * deniegan aunque este código tuviera un fallo.
 */

export const ROLES = [
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
  "FRONT_DESK",
  "CONTENT_EDITOR",
] as const;

export type Role = (typeof ROLES)[number];

/** Quién puede hacer qué. Principio de mínimo privilegio. */
export const PERMISSIONS = {
  "appointments:read": ["SUPER_ADMIN", "OWNER", "MANAGER", "FRONT_DESK"],
  "appointments:update": ["SUPER_ADMIN", "OWNER", "MANAGER", "FRONT_DESK"],
  "appointments:export": ["SUPER_ADMIN", "OWNER", "MANAGER", "FRONT_DESK"],
  "messages:read": ["SUPER_ADMIN", "OWNER", "MANAGER", "FRONT_DESK"],
  "messages:reply": ["SUPER_ADMIN", "OWNER", "MANAGER", "FRONT_DESK"],
  // El directorio reúne en una pantalla el teléfono, el correo y el
  // motivo de consulta de todo el que ha escrito. Recepción necesita la
  // solicitud que está trabajando, no el expediente de todos: por eso
  // esto es sólo de dirección.
  "clients:read": ["SUPER_ADMIN", "OWNER"],
  // Cifras agregadas del negocio: ningun dato de paciente, pero es
  // informacion de direccion.
  "metrics:read": ["SUPER_ADMIN", "OWNER"],
  // Una campana escribe a cientos de personas en nombre del negocio.
  // No es una accion de mostrador.
  "campaigns:manage": ["SUPER_ADMIN", "OWNER"],
  "offers:create": ["SUPER_ADMIN", "OWNER", "MANAGER", "CONTENT_EDITOR"],
  "offers:publish": ["SUPER_ADMIN", "OWNER", "MANAGER"],
  "offers:redeem": ["SUPER_ADMIN", "OWNER", "MANAGER", "FRONT_DESK"],
  "content:edit": ["SUPER_ADMIN", "OWNER", "MANAGER", "CONTENT_EDITOR"],
  "locations:manage": ["SUPER_ADMIN", "OWNER", "MANAGER"],
  "users:manage": ["SUPER_ADMIN", "OWNER"],
  "audit:read": ["SUPER_ADMIN", "OWNER"],
  "settings:manage": ["SUPER_ADMIN", "OWNER"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export interface AdminUser {
  readonly id: string;
  readonly email: string;
  /** Nombre mostrado en el historial de seguimiento */
  readonly displayName: string;
  readonly roles: readonly Role[];
}

/**
 * Devuelve el usuario autenticado con sus roles, o null.
 *
 * Envuelto en cache() de React: el layout y la página lo piden por
 * separado, y sin esto cada render hacía cuatro viajes a Supabase en vez
 * de dos. cache() dedupe dentro de la misma petición, no entre peticiones,
 * así que la sesión se sigue validando en cada carga.
 *
 * Usa getUser(), que valida el JWT contra Supabase. getSession() sólo lee
 * la cookie sin verificar la firma: sirve para pintar un avatar, nunca
 * para decidir permisos.
 */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Roles y perfil en paralelo: dos consultas, un solo tiempo de espera.
  const [rolesRes, profileRes] = await Promise.all([
    supabase.from("user_roles").select("roles(name)").eq("user_id", user.id),
    supabase.from("staff_profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
  ]);
  const { data, error } = rolesRes;

  if (error) {
    console.error("[auth] fallo leyendo roles:", error);
    return null;
  }

  const roles = (data ?? [])
    .map((r) => (r.roles as unknown as { name: Role } | null)?.name)
    .filter((n): n is Role => Boolean(n));

  // Autenticado pero sin ningún rol asignado: no es personal del panel.
  if (roles.length === 0) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    displayName: (profileRes.data?.display_name as string) ?? user.email?.split("@")[0] ?? "Staff",
    roles,
  };
});

export function can(user: AdminUser | null, permission: Permission): boolean {
  if (!user) return false;
  const allowed = PERMISSIONS[permission] as readonly Role[];
  return user.roles.some((r) => allowed.includes(r));
}

/** Etiqueta legible del rol de mayor privilegio. */
export function primaryRole(user: AdminUser): Role {
  for (const r of ROLES) if (user.roles.includes(r)) return r;
  return user.roles[0]!;
}
