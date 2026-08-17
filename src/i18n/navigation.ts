import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Usa SIEMPRE estos wrappers en lugar de next/link y next/navigation.
 * Resuelven automáticamente el slug localizado correcto.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
