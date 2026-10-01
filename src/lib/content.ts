import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

/**
 * src/lib/content.ts
 *
 * Lee las páginas escritas en markdown desde `content/`.
 *
 * Por qué markdown y no componentes: el contenido lo escribe otra
 * persona y va a cambiar muchas veces. Un archivo `.md` lo puede editar
 * cualquiera sin tocar código ni romper el build.
 *
 * No hay dependencia de `gray-matter`: el frontmatter que usamos es
 * plano (claves, cadenas y una lista), así que lo parseamos aquí y nos
 * ahorramos un paquete.
 */

export interface ContentPage {
  readonly page: string;
  readonly locale: string;
  readonly title: string;
  readonly description: string;
  /** Datos que la oficina todavía tiene que confirmar. */
  readonly verify: readonly string[];
  readonly body: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content");

/** Sólo letras, números, guiones y una barra. Cierra el paso a `../`. */
const SAFE_PAGE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/;

function parseFrontmatter(raw: string): {
  data: Record<string, string | string[]>;
  body: string;
} {
  if (!raw.startsWith("---")) return { data: {}, body: raw };

  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: raw };

  const head = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\r?\n/, "");

  const data: Record<string, string | string[]> = {};
  let listKey: string | null = null;

  for (const line of head.split(/\r?\n/)) {
    // Elemento de lista: continúa la clave anterior
    const item = /^\s*-\s*(.*)$/.exec(line);
    if (item && listKey) {
      const value = unquote(item[1]!.trim());
      if (value) (data[listKey] as string[]).push(value);
      continue;
    }

    const pair = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!pair) continue;

    const key = pair[1]!;
    const value = pair[2]!.trim();

    if (value === "" || value === "[]") {
      // `verify:` seguido de una lista, o una lista vacía
      data[key] = [];
      listKey = key;
    } else {
      data[key] = unquote(value);
      listKey = null;
    }
  }

  return { data, body };
}

function unquote(value: string): string {
  const m = /^"(.*)"$|^'(.*)'$/.exec(value);
  return (m?.[1] ?? m?.[2] ?? value).trim();
}

/**
 * `cache()` por petición: `generateMetadata` y el componente de la
 * página piden el mismo archivo, y sólo se lee del disco una vez.
 */
export const loadContent = cache(
  async (page: string, locale: string): Promise<ContentPage | null> => {
    if (!SAFE_PAGE.test(page)) return null;

    // Si falta el español se muestra el inglés antes que un 404. Es el
    // mal menor: una página en el otro idioma sirve, una página perdida no.
    for (const lang of locale === "en" ? ["en"] : [locale, "en"]) {
      try {
        const raw = await readFile(
          path.join(CONTENT_DIR, `${page}.${lang}.md`),
          "utf8",
        );
        const { data, body } = parseFrontmatter(raw);

        return {
          page,
          locale: lang,
          title: typeof data.title === "string" ? data.title : "",
          description: typeof data.description === "string" ? data.description : "",
          verify: Array.isArray(data.verify) ? data.verify : [],
          body,
        };
      } catch {
        // Archivo inexistente: probamos el idioma siguiente.
      }
    }

    return null;
  },
);

/**
 * Las páginas que existen bajo una carpeta, para `generateStaticParams`.
 * Devuelve los slugs sin idioma ni extensión, sin repetir.
 */
export async function listContentSlugs(folder: string): Promise<string[]> {
  if (folder && !SAFE_PAGE.test(folder)) return [];

  try {
    const files = await readdir(path.join(CONTENT_DIR, folder));
    const slugs = new Set<string>();

    for (const file of files) {
      const m = /^(.+)\.(en|es)\.md$/.exec(file);
      if (m) slugs.add(m[1]!);
    }

    return [...slugs].sort();
  } catch {
    return [];
  }
}
