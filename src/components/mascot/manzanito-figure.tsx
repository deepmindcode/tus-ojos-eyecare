/**
 * src/components/mascot/manzanito-figure.tsx
 *
 * Manzanito: una cabeza que es casi toda ojo, con bata de óptico.
 * Dibujado a partir de la referencia que pidió Wilfredo.
 *
 * En SVG y no en imagen: unos 3 KB dentro del HTML, cero descargas,
 * nítido en cualquier pantalla y sin exportar una versión por tamaño.
 *
 * El orden de pintado no es arbitrario: piernas y brazos van ANTES que
 * la bata, para que el hombro y la cadera queden tapados por ella.
 * Dibujados encima parecían tubos pegados al costado.
 *
 * El párpado es una copia exacta de la cabeza, del mismo color: al
 * bajar no parece una tapa encima del ojo, sino la propia cabeza
 * cerrándose. Las clases `mz-leg`, `mz-arm`, `mz-gaze` y `mz-lid` las
 * anima el CSS de `manzanito.tsx`; renombrarlas aquí rompe el paseo.
 *
 * Los identificadores de los degradados llevan el prefijo `mz` porque
 * son globales en la página: un `id="coat"` chocaría con cualquier otro
 * SVG del sitio que usara el mismo nombre.
 */
export function ManzanitoFigure({ title }: { readonly title: string }) {
  return (
    <svg
      className="mz-toon"
      viewBox="0 0 120 132"
      role="img"
      aria-label={title}
      focusable="false"
    >
      <defs>
        <radialGradient id="mzIris" cx="42%" cy="36%" r="68%">
          <stop offset="0%" stopColor="#b24fb2"/><stop offset="55%" stopColor="#800080"/><stop offset="100%" stopColor="#52004f"/>
        </radialGradient>
        <linearGradient id="mzCoat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff"/><stop offset="100%" stopColor="#e7ecef"/>
        </linearGradient>
        <linearGradient id="mzHead" x1="0.25" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#ffffff"/><stop offset="100%" stopColor="#dfe6ea"/>
        </linearGradient>
      </defs>
      {/* piernas */}
      <g className="mz-leg mz-l"><rect x="44" y="104" width="13" height="22" rx="6" fill="#2f3a4d"/><ellipse cx="47" cy="127" rx="11" ry="5.5" fill="#222b3a"/></g>
      <g className="mz-leg mz-r"><rect x="65" y="104" width="13" height="22" rx="6" fill="#2f3a4d"/><ellipse cx="75" cy="127" rx="11" ry="5.5" fill="#222b3a"/></g>
      {/* brazos */}
      <g className="mz-arm mz-l">
        <path d="M30 76 L16 100" stroke="#d3dade" strokeWidth="18" strokeLinecap="round" fill="none"/>
        <path d="M30 76 L16 100" stroke="url(#mzCoat)" strokeWidth="15" strokeLinecap="round" fill="none"/>
        <path d="M19 95 L15 102" stroke="#800080" strokeWidth="15" strokeLinecap="round"/>
        <circle cx="13" cy="106" r="8.5" fill="#f6d8bd"/>
      </g>
      <g className="mz-arm mz-r">
        <path d="M90 76 L104 100" stroke="#d3dade" strokeWidth="18" strokeLinecap="round" fill="none"/>
        <path d="M90 76 L104 100" stroke="url(#mzCoat)" strokeWidth="15" strokeLinecap="round" fill="none"/>
        <path d="M101 95 L105 102" stroke="#800080" strokeWidth="15" strokeLinecap="round"/>
        <circle cx="107" cy="106" r="8.5" fill="#f6d8bd"/>
      </g>
      {/* bata */}
      <path d="M22 112 C20 92 27 76 44 71 L60 86 L76 71 C93 76 100 92 98 112 Z" fill="url(#mzCoat)" stroke="#cfd7dc" strokeWidth="2" strokeLinejoin="round"/>
      {/* solapas: morado por fuera, verde por dentro */}
      <path d="M44 71 L60 86 L50 95 L36 78 Z" fill="#800080"/>
      <path d="M76 71 L60 86 L70 95 L84 78 Z" fill="#800080"/>
      <path d="M48 73 L60 86 L53 92 L42 77 Z" fill="#17a0a0"/>
      <path d="M72 73 L60 86 L67 92 L78 77 Z" fill="#17a0a0"/>
      {/* bolsillos y botones */}
      <rect x="28" y="92" width="16" height="11" rx="2.5" fill="none" stroke="#cfd7dc" strokeWidth="2"/>
      <rect x="76" y="92" width="16" height="11" rx="2.5" fill="none" stroke="#cfd7dc" strokeWidth="2"/>
      <circle cx="52" cy="101" r="2.4" fill="#17a0a0"/><circle cx="52" cy="109" r="2.4" fill="#17a0a0"/>
      {/* cabeza */}
      <ellipse cx="60" cy="43" rx="39" ry="41" fill="url(#mzHead)" stroke="#cfd7dc" strokeWidth="2"/>
      {/* ojo */}
      <g className="mz-gaze">
        <circle cx="62" cy="40" r="26" fill="url(#mzIris)"/>
        <circle cx="62" cy="40" r="19" fill="none" stroke="#9c4a9c" strokeWidth="1.6" opacity=".45"/>
        <circle cx="62" cy="40" r="23" fill="none" stroke="#5e0a5c" strokeWidth="2" opacity=".35"/>
        <circle cx="62" cy="40" r="26" fill="none" stroke="#3c0039" strokeWidth="2.5"/>
        <circle cx="62" cy="40" r="12.5" fill="#140116"/>
        <ellipse cx="53" cy="30" rx="7" ry="5.5" fill="#fff" opacity=".92" transform="rotate(-25 53 30)"/>
        <circle cx="71" cy="51" r="3.4" fill="#fff" opacity=".5"/>
      </g>
      {/* parpado */}
      <ellipse className="mz-lid" cx="60" cy="43" rx="39" ry="41" fill="url(#mzHead)"/>
      {/* boca */}
      <path className="mz-mouth" d="M41 68 C47 86 73 86 79 68 C70 74 50 74 41 68 Z" fill="#6b2230"/>
      <path d="M51 77 C56 83 64 83 69 77 C62 75 58 75 51 77 Z" fill="#e0607a"/>
    </svg>
  );
}
