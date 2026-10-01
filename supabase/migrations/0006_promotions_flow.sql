-- =====================================================================
-- TUS OJOS EYECARE — Migración 0006
-- supabase/migrations/0006_promotions_flow.sql
--
-- Conecta promoción → cita. El flujo completo:
--
--   1. Admin crea la promoción y elige si vale para una sede o para las tres
--   2. El visitante ve el popup
--   3. Al hacer clic va a /appointment?promo=<slug>
--   4. Si la promo es de UNA sede, esa sede ya viene elegida
--   5. Al enviar, la cita guarda QUÉ descuento está pidiendo
--   6. Recepción ve el descuento en la ficha, antes de llamar
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Lo que le falta a `promotions` para este flujo
-- ---------------------------------------------------------------------
alter table public.promotions
  -- Identificador para la URL. No exponemos el uuid: un slug legible
  -- sirve además para medir campañas sin revelar nada interno.
  add column slug text unique,

  -- El texto del descuento tal como debe aparecer en la ficha de la
  -- cita. Es lo que recepción lee antes de llamar, así que se escribe
  -- en lenguaje de mostrador: "20% en armazones", no "PROMO_FRAMES_20".
  add column discount_label_en text,
  add column discount_label_es text,

  -- Si la promo vale para una sola sede, aquí queda fijada. La sede se
  -- preselecciona en el formulario y el visitante no puede cambiarla:
  -- una oferta de Camden que acaba en una cita de Cherry Hill genera
  -- una discusión en el mostrador que nadie quiere tener.
  add column exclusive_location_id uuid references public.locations;

-- Un slug por promoción activa. El índice parcial permite reutilizar el
-- slug de una campaña archivada el año siguiente.
create unique index promotions_slug_active
  on public.promotions (slug)
  where status in ('SCHEDULED', 'ACTIVE', 'PAUSED');

-- Coherencia: si hay sede exclusiva, location_target debe reflejarlo.
-- Lo garantiza la base, no la confianza en quien edite desde el panel.
create or replace function public.sync_promotion_location_target()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_slug text;
begin
  if new.exclusive_location_id is not null then
    select slug into v_slug from public.locations where id = new.exclusive_location_id;
    new.location_target := array[v_slug];
  end if;
  return new;
end;
$$;

create trigger promotions_sync_location
  before insert or update on public.promotions
  for each row execute function public.sync_promotion_location_target();

-- ---------------------------------------------------------------------
-- 2. La cita recuerda qué promoción la trajo
-- ---------------------------------------------------------------------
alter table public.appointment_requests
  add column promotion_id uuid references public.promotions on delete set null,
  -- Copia del texto en el momento de la solicitud. Deliberado: si el
  -- admin edita la promoción el mes que viene, la cita debe seguir
  -- diciendo qué se le prometió a ESTA persona. Un descuento es una
  -- promesa con fecha.
  add column promotion_label text;

create index idx_appointments_promotion on public.appointment_requests(promotion_id);

-- ---------------------------------------------------------------------
-- 3. Resolver una promoción desde el sitio público
--
-- SECURITY DEFINER con filtro explícito de estado y fechas: el visitante
-- sólo puede resolver promociones realmente activas, aunque adivine el
-- slug de una programada para diciembre.
-- ---------------------------------------------------------------------
create or replace function public.get_active_promotion(p_slug text)
returns table (
  id uuid,
  slug text,
  title_en text,
  title_es text,
  description_en text,
  description_es text,
  discount_label_en text,
  discount_label_es text,
  offer_terms_en text,
  offer_terms_es text,
  cta_type text,
  cta_label_en text,
  cta_label_es text,
  display_type public.promotion_display_type,
  delay_seconds integer,
  dismissible boolean,
  frequency text,
  language_target text[],
  page_target text[],
  exclusive_location_slug text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.id, p.slug,
    p.title_en, p.title_es,
    p.description_en, p.description_es,
    p.discount_label_en, p.discount_label_es,
    p.offer_terms_en, p.offer_terms_es,
    p.cta_type, p.cta_label_en, p.cta_label_es,
    p.display_type, p.delay_seconds, p.dismissible, p.frequency,
    p.language_target, p.page_target,
    l.slug as exclusive_location_slug
  from public.promotions p
  left join public.locations l on l.id = p.exclusive_location_id
  where p.slug = p_slug
    and p.status = 'ACTIVE'
    and (p.start_at is null or p.start_at <= now())
    and (p.end_at   is null or p.end_at   >  now())
  limit 1;
$$;

-- Promociones que corresponden a una página y un idioma concretos.
-- El popup pide esto al cargar; devuelve como mucho una, la de mayor
-- prioridad.
create or replace function public.get_promotion_for_page(
  p_path   text,
  p_locale text
)
returns table (
  id uuid,
  slug text,
  title text,
  description text,
  discount_label text,
  terms text,
  cta_type text,
  cta_label text,
  display_type public.promotion_display_type,
  delay_seconds integer,
  dismissible boolean,
  frequency text,
  exclusive_location_slug text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.id, p.slug,
    case when p_locale = 'es' then p.title_es else p.title_en end,
    case when p_locale = 'es' then p.description_es else p.description_en end,
    case when p_locale = 'es' then p.discount_label_es else p.discount_label_en end,
    case when p_locale = 'es' then p.offer_terms_es else p.offer_terms_en end,
    p.cta_type,
    case when p_locale = 'es' then p.cta_label_es else p.cta_label_en end,
    p.display_type, p.delay_seconds, p.dismissible, p.frequency,
    l.slug
  from public.promotions p
  left join public.locations l on l.id = p.exclusive_location_id
  where p.status = 'ACTIVE'
    and (p.start_at is null or p.start_at <= now())
    and (p.end_at   is null or p.end_at   >  now())
    and p_locale = any (p.language_target)
    and (
      'all' = any (p.page_target)
      or p_path = any (p.page_target)
    )
    -- Nunca sobre páginas legales ni durante el formulario de cita
    -- (§98). La comprobación vive aquí además de en el cliente: una
    -- promoción encima de la política de privacidad es un problema de
    -- cumplimiento, no de diseño.
    and p_path not like '/legal%'
    and p_path not like '/appointment%'
    and p_path not like '/admin%'
  order by p.priority desc, p.created_at desc
  limit 1;
$$;

revoke execute on function public.get_active_promotion(text) from public;
revoke execute on function public.get_promotion_for_page(text, text) from public;
grant  execute on function public.get_active_promotion(text) to anon, authenticated;
grant  execute on function public.get_promotion_for_page(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Registrar un evento de promoción
--
-- Sólo datos no sensibles (§92): qué promoción, qué evento, qué idioma,
-- qué sede. Nunca nombre, teléfono ni motivo de consulta.
-- ---------------------------------------------------------------------
create or replace function public.track_promotion_event(
  p_promotion_id uuid,
  p_event        text,
  p_locale       text default null,
  p_location     text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_event not in ('impression','click','cta_click','dismiss','appointment_start') then
    return;
  end if;

  insert into public.promotion_events (promotion_id, event, locale, location_slug)
  values (p_promotion_id, p_event, p_locale, p_location);
end;
$$;

grant execute on function public.track_promotion_event(uuid, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Rendimiento de campañas para el panel
-- ---------------------------------------------------------------------
create or replace view public.promotion_stats as
select
  p.id,
  p.slug,
  p.internal_name,
  p.status,
  p.start_at,
  p.end_at,
  count(*) filter (where e.event = 'impression')        as impressions,
  count(*) filter (where e.event = 'cta_click')         as cta_clicks,
  count(*) filter (where e.event = 'dismiss')           as dismissals,
  count(distinct a.id)                                  as appointments
from public.promotions p
left join public.promotion_events e on e.promotion_id = p.id
left join public.appointment_requests a on a.promotion_id = p.id
group by p.id;

-- ---------------------------------------------------------------------
-- 6. Promoción de ejemplo, en borrador (§99)
--    NO es una oferta real. Sirve para que el equipo vea cómo funciona
--    antes de crear la primera de verdad.
-- ---------------------------------------------------------------------
insert into public.promotions (
  internal_name, slug,
  title_en, title_es,
  description_en, description_es,
  discount_label_en, discount_label_es,
  offer_terms_en, offer_terms_es,
  cta_type, cta_label_en, cta_label_es,
  location_target, page_target, language_target,
  display_type, status, priority,
  frequency, trigger_type, delay_seconds, dismissible,
  is_demo
) values (
  'DEMO — Back to school (no publicar)',
  'demo-back-to-school',
  'Back-to-school eye exams',
  'Exámenes de la vista para el regreso a clases',
  'Book your child''s eye exam before the school year starts.',
  'Agenda el examen de la vista de tu hijo antes de que empiece el año escolar.',
  '20% off children''s frames',
  '20% de descuento en armazones infantiles',
  'Restrictions may apply. Cannot be combined with other offers. Ask the office for details.',
  'Pueden aplicar restricciones. No combinable con otras ofertas. Consulta en la oficina.',
  'schedule', 'Schedule now', 'Agendar ahora',
  array['all'], array['all'], array['en','es'],
  'CORNER', 'DRAFT', 0,
  'once_24h', 'delay', 7, true,
  true
);