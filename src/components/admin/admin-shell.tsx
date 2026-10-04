"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Inbox,
  Tag,
  Contact,
  TrendingUp,
  ScrollText,
  Users,
  BookOpen,
  KeyRound,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/brand/logo";

/**
 * Armazón del panel: barra lateral, cabecera y cierre de sesión.
 *
 * El panel NO se traduce (§104): el equipo interno trabaja en inglés y
 * traducirlo ahora multiplicaría el mantenimiento sin beneficio. La
 * arquitectura admite localizarlo más adelante.
 *
 * Usa next/link, no el Link de next-intl: /admin vive fuera de [locale].
 */
export function AdminShell({
  children,
  email,
  role,
  canSeeAudit,
  canManageUsers,
  canManageOffers,
  canSeeClients,
  canSeeTrends,
}: {
  readonly children: React.ReactNode;
  readonly email: string;
  readonly role: string;
  readonly canSeeAudit: boolean;
  readonly canManageUsers: boolean;
  readonly canManageOffers: boolean;
  readonly canSeeClients: boolean;
  readonly canSeeTrends: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Los enlaces se ocultan según permisos, pero cada página vuelve a
  // comprobarlos en el servidor: esconder un enlace no es proteger nada.
  const nav = [
    { href: "/admin", label: "Appointments", icon: CalendarDays, show: true },
    { href: "/admin/inbox", label: "Inbox", icon: Inbox, show: true },
    { href: "/admin/offers", label: "Offers", icon: Tag, show: canManageOffers },
    // Reune los datos de contacto de todo el mundo en una pantalla:
    // solo direccion.
    { href: "/admin/clients", label: "Clients", icon: Contact, show: canSeeClients },
    { href: "/admin/trends", label: "Trends", icon: TrendingUp, show: canSeeTrends },
    { href: "/admin/users", label: "Team", icon: Users, show: canManageUsers },
    { href: "/admin/audit", label: "Audit log", icon: ScrollText, show: canSeeAudit },
    // El manual lo ve todo el mundo; dentro cambia segun el rol.
    { href: "/admin/guide", label: "Guide", icon: BookOpen, show: true },
  ].filter((n) => n.show);

  async function signOut() {
    await createClient().auth.signOut();
    router.refresh();
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Barra lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border-subtle bg-surface transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-border-subtle px-5 py-4">
          <LogoMark className="h-8 w-auto" />
          <span className="font-display text-sm font-extrabold uppercase tracking-wide">
            Admin
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="ml-auto lg:hidden"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 p-3">
          <ul className="grid gap-1">
            {nav.map((n) => {
              const active = pathname === n.href;
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                      active
                        ? "bg-brand-primary-tint text-brand-primary"
                        : "text-text-secondary hover:bg-brand-secondary-tint"
                    }`}
                  >
                    <n.icon className="size-4.5 shrink-0" aria-hidden="true" />
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border-subtle p-4">
          <p className="truncate text-sm font-semibold">{email}</p>
          <p className="text-xs uppercase tracking-wider text-brand-secondary-deep">
            {role.replace("_", " ")}
          </p>
          {/* Sin permiso: cualquiera del equipo cambia la suya. */}
          <Link
            href="/admin/account"
            onClick={() => setOpen(false)}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-border-subtle text-sm font-bold hover:border-brand-primary hover:text-brand-primary"
          >
            <KeyRound className="size-4" aria-hidden="true" />
            My account
          </Link>

          <button
            type="button"
            onClick={signOut}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-border-subtle text-sm font-bold hover:border-brand-primary hover:text-brand-primary"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center gap-3 border-b border-border-subtle bg-surface px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="rounded-lg border border-border-subtle p-2"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <span className="font-display font-bold">Tus Ojos Admin</span>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
