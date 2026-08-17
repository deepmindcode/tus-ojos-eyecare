import Image from "next/image";

/**
 * MARCA en SVG, reconstruida midiendo el logotipo original.
 *
 * Construcción real: elipse exterior teal → elipse interior blanca casi
 * circular → T púrpura recortada por la interior. El blanco interior es
 * parte del logo, no transparencia: sobre fondo oscuro hay que usar la
 * variante correspondiente.
 */
export function LogoMark({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 605 380" className={className} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="tusojos-inner">
          <ellipse cx="302.5" cy="190" rx="208.5" ry="184" />
        </clipPath>
      </defs>
      <ellipse cx="302.5" cy="190" rx="302.5" ry="190" fill="#008080" />
      <ellipse cx="302.5" cy="190" rx="208.5" ry="184" fill="#FFFFFF" />
      <path
        d="M0 89 H605 V159 H372 V374 H233 V159 H0 Z"
        fill="#800080"
        clipPath="url(#tusojos-inner)"
      />
    </svg>
  );
}

interface LogoLockupProps {
  readonly className?: string;
  readonly variant?: "light" | "dark";
  /** Pásalo vacío cuando el enlace contenedor ya tiene aria-label. */
  readonly alt?: string;
  readonly priority?: boolean;
}

/**
 * LOCKUP completo (marca + "tus ojos").
 *
 * Es un PNG y no un SVG porque el texto tiene una tipografía propia que
 * no está vectorizada. TODO: pedir al diseñador el original en .ai/.eps
 * y sustituirlo por SVG; ganaríamos nitidez y ~40 KB.
 */
export function LogoLockup({
  className,
  variant = "light",
  alt = "Tus Ojos Eyecare",
  priority = false,
}: LogoLockupProps) {
  return (
    <Image
      src={variant === "dark" ? "/brand/logo-lockup-dark.png" : "/brand/logo-lockup.png"}
      alt={alt}
      width={700}
      height={194}
      priority={priority}
      className={`h-10 w-auto ${className ?? ""}`}
    />
  );
}
