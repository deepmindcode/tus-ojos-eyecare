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
