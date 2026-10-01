/**
 * src/components/seo/json-ld.tsx
 *
 * Inserta datos estructurados.
 *
 * `JSON.stringify` y no una plantilla de texto: serializar escapa lo que
 * haya que escapar. Construir el JSON a mano permitiria que un `</script>`
 * dentro de un texto cerrara la etiqueta antes de tiempo.
 *
 * Aun asi se neutraliza `<` por si algun dato lo trae: es la via por la
 * que un JSON-LD se convierte en ejecucion de codigo.
 */

export function JsonLd({ data }: { readonly data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // El contenido lo genera el servidor desde la configuracion del
      // sitio, nunca desde algo que escriba un visitante.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}