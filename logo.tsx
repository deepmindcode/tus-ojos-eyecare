/**
 * Marca de Tus Ojos recreada en SVG a partir del archivo original del
 * logo: anillo elíptico teal #518782 y T púrpura #6F2A70.
 *
 * En SVG es nítida a cualquier tamaño y pesa medio kilobyte. No la
 * sustituyas por un PNG.
 */

interface LogoMarkProps {
  readonly className?: string;
  readonly variant?: "light" | "dark";
}

export function LogoMark({ className, variant = "light" }: LogoMarkProps) {
  // En fondo oscuro los colores originales no alcanzan contraste;
  // se aclaran manteniendo la identidad.
  const ring = variant === "dark" ? "#8FC4BE" : "#518782";
  const bar = variant === "dark" ? "#C79BC8" : "#6F2A70";
  const clipId = `tus-ojos-clip-${variant}`;

  return (
    <svg viewBox="0 0 614 396" className={className} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipId}>
          <ellipse cx="307" cy="183" rx="299" ry="175" />
        </clipPath>
      </defs>
      <path
        d="M0 109 H614 V147 H379 V340 H255 V147 H0 Z"
        fill={bar}
        clipPath={`url(#${clipId})`}
      />
      <ellipse cx="307" cy="183" rx="299" ry="175" fill="none" stroke={ring} strokeWidth="16" />
    </svg>
  );
}

interface LogoLockupProps {
  readonly className?: string;
  readonly variant?: "light" | "dark";
}

/** Marca + nombre. Úsalo en navbar, drawer y pie. */
export function LogoLockup({ className, variant = "light" }: LogoLockupProps) {
  const dark = variant === "dark";
  return (
    <span className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark variant={variant} className="h-9 w-auto shrink-0" />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-[1.1rem] font-extrabold uppercase tracking-wide ${
            dark ? "text-white" : "text-text-primary"
          }`}
        >
          Tus Ojos
        </span>
        <span
          className={`text-[0.6rem] font-semibold uppercase tracking-[0.2em] ${
            dark ? "text-[#8FC4BE]" : "text-brand-secondary-deep"
          }`}
        >
          Eyecare
        </span>
      </span>
    </span>
  );
}
