/**
 * src/components/mascot/manzanito-figure.tsx
 *
 * El dibujo de Manzanito: un ojo con bata de óptico.
 *
 * En SVG y no en una imagen a propósito. Un PNG o un GIF serían una
 * descarga más en cada página; esto son unos 2 KB dentro del HTML, se
 * ve nítido en cualquier pantalla y no hay que exportar una versión
 * para cada tamaño.
 *
 * El orden de pintado importa y no es arbitrario: piernas y brazos van
 * ANTES que la bata para que el hombro y la cadera queden tapados por
 * ella. Dibujados encima, se veían como tubos sueltos pegados al lado
 * del cuerpo.
 *
 * Las clases `mz-leg`, `mz-arm`, `mz-gaze` y `mz-lid` las anima el CSS
 * de `manzanito.tsx`. Si se renombran aquí, el paseo deja de funcionar.
 */
export function ManzanitoFigure({ title }: { readonly title: string }) {
  return (
    <svg
      className="mz-toon"
      /* Recortado por arriba: con el viewBox empezando en 0 quedaban doce
         unidades vacías sobre la cabeza y el bocadillo parecía flotar
         lejos de él. */
      viewBox="0 12 110 128"
      role="img"
      aria-label={title}
      focusable="false"
    >
      {/* piernas */}
      <g className="mz-leg mz-l">
        <rect x="42" y="112" width="12" height="20" rx="4" fill="#005f5f" />
        <ellipse cx="45" cy="133" rx="9.5" ry="5" fill="#27312f" />
      </g>
      <g className="mz-leg mz-r">
        <rect x="56" y="112" width="12" height="20" rx="4" fill="#005f5f" />
        <ellipse cx="65" cy="133" rx="9.5" ry="5" fill="#27312f" />
      </g>

      {/* brazos: en diagonal hacia fuera, para que la mano caiga fuera
          de la silueta de la bata y se vea al saludar */}
      <g className="mz-arm mz-l">
        <path d="M34 78 L18 110" stroke="#c6d2cf" strokeWidth="15" strokeLinecap="round" fill="none" />
        <path d="M34 78 L18 110" stroke="#ffffff" strokeWidth="11.5" strokeLinecap="round" fill="none" />
        <circle cx="16" cy="113" r="7" fill="#f0c49c" />
      </g>
      <g className="mz-arm mz-r">
        <path d="M76 78 L92 110" stroke="#c6d2cf" strokeWidth="15" strokeLinecap="round" fill="none" />
        <path d="M76 78 L92 110" stroke="#ffffff" strokeWidth="11.5" strokeLinecap="round" fill="none" />
        <circle cx="94" cy="113" r="7" fill="#f0c49c" />
      </g>

      {/* cuello */}
      <rect x="48" y="50" width="14" height="24" rx="5" fill="#dfe8e5" />

      {/* bata */}
      <path
        d="M24 120 C23 96 31 74 45 69 L55 81 L65 69 C79 74 87 96 86 120 Z"
        fill="#ffffff"
        stroke="#c6d2cf"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M45 69 L55 81 L49 85 L41 73 Z" fill="#edf2f0" />
      <path d="M65 69 L55 81 L61 85 L69 73 Z" fill="#edf2f0" />
      <circle cx="55" cy="94" r="2.2" fill="#b9c6c3" />
      <circle cx="55" cy="104" r="2.2" fill="#b9c6c3" />
      {/* chapa con el nombre, en el verde de la marca */}
      <rect x="64" y="90" width="11" height="6.5" rx="1.8" fill="#008080" />

      {/* el ojo, que es la cabeza */}
      <path
        d="M17 42 C30 18 80 18 93 42 C80 66 30 66 17 42 Z"
        fill="#ffffff"
        stroke="#27312f"
        strokeWidth="3.6"
        strokeLinejoin="round"
      />
      <g className="mz-gaze">
        <circle cx="55" cy="42" r="17" fill="#800080" />
        <circle cx="55" cy="42" r="17" fill="none" stroke="#6b006b" strokeWidth="2.5" />
        <circle cx="55" cy="42" r="8" fill="#1d1420" />
        <circle cx="48.5" cy="36" r="5" fill="#ffffff" opacity=".95" />
        <circle cx="61" cy="48" r="2.4" fill="#ffffff" opacity=".6" />
      </g>
      {/* párpado: baja desde arriba al parpadear */}
      <path
        className="mz-lid"
        d="M17 42 C30 18 80 18 93 42 C80 66 30 66 17 42 Z"
        fill="#e8b89a"
        stroke="#27312f"
        strokeWidth="3.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
