@AGENTS.md

# Control de versiones (obligatorio en cada publicación)

Cada vez que publiques un cambio en este sitio, agrega una entrada al inicio de la lista en
`src/lib/releases.ts`, en el mismo commit: el número de versión siguiente, la fecha de hoy,
un título corto y los cambios explicados en lenguaje sencillo, en español y en inglés, sin
términos técnicos (como los entendería quien usa el sitio). La pantalla Updates del panel
(`/admin/updates`, solo dirección) muestra esa lista y es la forma en que el dueño lleva el
control de lo publicado. Un cambio sin su entrada no está terminado.
