-- 0012_manzanito.sql
--
-- El interruptor de Manzanito, la mascota que invita a pedir cita.
--
-- Vive en `site_settings` y no en una tabla propia porque es eso: un
-- ajuste del sitio. `is_public = true` porque la ruta /api/promotion lo
-- lee con la clave anónima para decidir si la mascota sale; no hay nada
-- que proteger en un sí o un no que cualquiera puede comprobar mirando
-- la página.
--
-- Apagado de fábrica a propósito. Una mascota que empieza a aparecer
-- sola en el sitio de un negocio el día que se despliega el código es
-- una sorpresa, no una función. La enciende quien manda, cuando quiera.
INSERT INTO public.site_settings (key, value, is_public, description)
VALUES (
  'manzanito_enabled',
  'false'::jsonb,
  true,
  'Manzanito, la mascota que invita a pedir cita. Lo encienden OWNER y SUPER_ADMIN desde Offers. Apagado de fabrica.'
)
ON CONFLICT (key) DO NOTHING;

-- Cada cuánto vuelve a salirle a la misma persona. Lo elige dirección
-- desde el mismo sitio que el interruptor.
--
--   daily   — una vez cada 24 horas (de fábrica)
--   weekly  — una vez por semana
--   session — una vez por visita
--   always  — en cada página
--
-- `always` existe porque se pidió, no porque se recomiende: un muñeco
-- que salta encima del texto en cada página echa gente del sitio, y
-- Google penaliza lo que tapa contenido en móvil.
INSERT INTO public.site_settings (key, value, is_public, description)
VALUES (
  'manzanito_frequency',
  '"daily"'::jsonb,
  true,
  'Cada cuanto sale Manzanito a la misma persona: daily, weekly, session o always.'
)
ON CONFLICT (key) DO NOTHING;
