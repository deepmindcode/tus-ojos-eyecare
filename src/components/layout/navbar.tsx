"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Menu, X, MessageSquare, Plus, Minus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LogoLockup } from "@/components/brand/logo";
import { MAIN_NAV } from "@/config/navigation";
import { LOCATIONS } from "@/config/site";

/**
 * Navegación principal: seis entradas con submenú en escritorio y
 * cajón con acordeones en móvil.
 *
 * Accesibilidad (§8): aria-expanded en cada disparador, ESC cierra,
 * clic fuera cierra, el cajón atrapa el foco y lo devuelve al botón
 * que lo abrió.
 */
export function Navbar() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  const principal = LOCATIONS.find((l) => l.isPrincipal)!;

  // ESC cierra cualquier capa abierta
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpenMenu(null);
      if (drawerOpen) {
        setDrawerOpen(false);
        burgerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Clic fuera cierra el submenú de escritorio
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Bloquea el scroll de fondo mientras el cajón está abierto
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Atrapa el foco dentro del cajón
  useEffect(() => {
    if (!drawerOpen) return;
    const node = drawerRef.current;
    if (!node) return;
    const focusables = node.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
    focusables[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    node.addEventListener("keydown", onKeyDown);
    return () => node.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  function closeDrawer() {
    setDrawerOpen(false);
    burgerRef.current?.focus();
  }

  return (
    <>
      <header
        ref={navRef}
        className="sticky top-0 z-50 border-b border-border-subtle bg-surface/95 backdrop-blur"
      >
        <div className="mx-auto flex w-[92%] max-w-[1200px] items-center justify-between gap-5 py-3">
          <Link href="/" className="shrink-0" aria-label="Tus Ojos Eyecare">
            <LogoLockup alt="" priority />
          </Link>

          {/* Escritorio */}
          <ul className="hidden items-center gap-1 lg:flex">
            {MAIN_NAV.map((item) => {
              if (!item.groups) {
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href!}
                      className="rounded-lg px-3 py-2.5 text-[0.95rem] font-semibold hover:bg-brand-secondary-tint"
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                );
              }
              const isOpen = openMenu === item.key;
              return (
                <li key={item.key} className="relative">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenMenu(isOpen ? null : item.key)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[0.95rem] font-semibold hover:bg-brand-secondary-tint"
                  >
                    {t(item.key)}
                    <ChevronDown
                      className={`size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <div className="absolute left-0 top-[calc(100%+0.4rem)] min-w-[280px] rounded-2xl border border-border-subtle bg-surface p-2 shadow-xl">
                      {item.groups.map((group) => (
                        <div key={group.key}>
                          {item.groups!.length > 1 && (
                            <p className="px-3 pb-1 pt-2.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-text-secondary">
                              {t(group.key)}
                            </p>
                          )}
                          <ul>
                            {group.children.map((child) => (
                              <li key={child.key}>
                                <Link
                                  href={child.href}
                                  onClick={() => setOpenMenu(null)}
                                  className="block rounded-lg px-3 py-2 text-sm hover:bg-brand-secondary-tint"
                                >
                                  {t(child.key)}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <a
              href={`sms:${principal.smsE164}`}
              className="flex items-center gap-1.5 rounded-full border-2 border-border-subtle bg-surface px-4 py-2 text-sm font-bold text-brand-secondary-deep hover:border-brand-secondary hover:bg-brand-secondary-tint"
            >
              <MessageSquare className="size-4" aria-hidden="true" />
              {tc("text")}
            </a>
            <Link
              href="/appointment"
              className="rounded-full bg-brand-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-primary-deep"
            >
              {tc("schedule")}
            </Link>
          </div>

          <button
            ref={burgerRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            aria-label={tc("openMenu")}
            className="rounded-lg border border-border-subtle p-2.5 lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Móvil */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 lg:hidden" onClick={closeDrawer} aria-hidden="true" />
      )}
      <div
        id="mobile-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={tc("menu")}
        className={`fixed inset-y-0 right-0 z-[70] flex w-[min(380px,90vw)] flex-col overflow-y-auto bg-surface transition-transform duration-200 lg:hidden ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <LogoLockup alt="" />
          <button type="button" onClick={closeDrawer} aria-label={tc("closeMenu")} className="p-2">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 px-5 py-4">
          <Link
            href="/appointment"
            onClick={closeDrawer}
            className="col-span-2 flex min-h-11 items-center justify-center rounded-full bg-brand-primary font-bold text-white"
          >
            {tc("schedule")}
          </Link>
          <a
            href={`tel:${principal.phoneE164}`}
            className="flex min-h-11 items-center justify-center rounded-full border-2 border-border-subtle font-bold text-brand-secondary-deep"
          >
            {tc("call")}
          </a>
          <a
            href={`sms:${principal.smsE164}`}
            className="flex min-h-11 items-center justify-center rounded-full border-2 border-border-subtle font-bold text-brand-secondary-deep"
          >
            {tc("text")}
          </a>
        </div>

        <nav className="px-5 pb-10">
          {MAIN_NAV.map((item) => {
            if (!item.groups) {
              return (
                <div key={item.key} className="border-b border-border-subtle">
                  <Link
                    href={item.href!}
                    onClick={closeDrawer}
                    className="block py-4 text-[1.05rem] font-bold"
                  >
                    {t(item.key)}
                  </Link>
                </div>
              );
            }
            const isOpen = openAccordion === item.key;
            return (
              <div key={item.key} className="border-b border-border-subtle">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenAccordion(isOpen ? null : item.key)}
                  className="flex w-full items-center justify-between py-4 text-left text-[1.05rem] font-bold"
                >
                  {t(item.key)}
                  {isOpen ? (
                    <Minus className="size-4" aria-hidden="true" />
                  ) : (
                    <Plus className="size-4" aria-hidden="true" />
                  )}
                </button>
                {isOpen && (
                  <div className="pb-3">
                    {item.groups.map((group) =>
                      group.children.map((child) => (
                        <Link
                          key={child.key}
                          href={child.href}
                          onClick={closeDrawer}
                          className="block border-l-2 border-border-subtle py-2 pl-3 text-text-secondary hover:border-brand-primary hover:text-brand-primary"
                        >
                          {t(child.key)}
                        </Link>
                      )),
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
}
