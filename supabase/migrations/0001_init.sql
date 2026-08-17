-- =====================================================================
-- TUS OJOS EYECARE — Migración inicial
-- supabase/migrations/0001_init.sql
--
-- MODELO DE SEGURIDAD (leer antes de modificar):
--   1. RLS activado en TODAS las tablas de public. Sin excepción.
--   2. El rol `anon` sólo puede LEER contenido publicado. No escribe nunca.
--   3. Los formularios públicos NO escriben con la anon key. Escriben desde
--      route handlers de Next.js con service_role, después de validar
--      Turnstile + rate limit. service_role ignora RLS por diseño.
--   4. Las comprobaciones de rol usan funciones SECURITY DEFINER para evitar
--      recursión infinita al aplicar políticas sobre user_roles.
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- =====================================================================
-- 1. ROLES Y PERMISOS (RBAC)
-- =====================================================================
create type public.app_role as enum
  ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'FRONT_DESK', 'CONTENT_EDITOR');

create table public.roles (
  id          uuid primary key default uuid_generate_v4(),
  name        public.app_role not null unique,
  description text,
  created_at  timestamptz not null default now()
);

insert into public.roles (name, description) values
  ('SUPER_ADMIN',    'Acceso total al sistema, incluida gestión de integraciones'),
  ('OWNER',          'Propietario del negocio'),
  ('MANAGER',        'Gestión de ubicaciones y personal'),
  ('FRONT_DESK',     'Gestión de citas y comunicación con pacientes'),
  ('CONTENT_EDITOR', 'Gestión de contenido del sitio');

create table public.user_roles (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users on delete cascade,
  role_id     uuid not null references public.roles on delete cascade,
  assigned_by uuid references auth.users,
  assigned_at timestamptz not null default now(),
  unique (user_id, role_id)
);

-- ---------------------------------------------------------------------
-- Funciones de comprobación de rol.
-- SECURITY DEFINER: se ejecutan como el propietario de la función, así que
-- la lectura interna de user_roles NO vuelve a disparar las políticas RLS
-- de user_roles. Sin esto, Postgres aborta con recursión infinita.
-- ---------------------------------------------------------------------
create or replace function public.user_has_role(required text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name::text = any(required)
  );
$$;

-- ¿Es personal interno de cualquier tipo?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid());
$$;

revoke execute on function public.user_has_role(text[]) from anon;
revoke execute on function public.is_staff() from anon;
grant  execute on function public.user_has_role(text[]) to authenticated;
grant  execute on function public.is_staff() to authenticated;

-- =====================================================================
-- 2. UBICACIONES
-- =====================================================================
create table public.locations (
  id              uuid primary key default uuid_generate_v4(),
  slug            text not null unique,          -- slug EN
  slug_es         text not null unique,          -- slug ES (§69, independiente)
  name            text not null,
  name_es         text not null,
  address_line1   text not null,
  city            text not null,
  state           text not null,
  postal_code     text not null,
  phone           text not null,
  sms_number      text,
  google_maps_url text,
  -- TODO: REQUIRES BUSINESS VERIFICATION — §78 prohíbe inventar coordenadas
  latitude        numeric(10,8),
  longitude       numeric(11,8),
  hours           jsonb not null default '{}'::jsonb,
  -- Contenido único por ubicación (§77): intro, parking, transporte, landmarks
  content_en      jsonb not null default '{}'::jsonb,
  content_es      jsonb not null default '{}'::jsonb,
  seo_en          jsonb not null default '{}'::jsonb,
  seo_es          jsonb not null default '{}'::jsonb,
  needs_verification boolean not null default true,
  active          boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

insert into public.locations
  (slug, slug_es, name, name_es, address_line1, city, state, postal_code, phone, sms_number, google_maps_url, hours, sort_order)
values
  ('camden-nj-eye-care',       'cuidado-de-la-vista-camden-nj',       'Camden, NJ',       'Camden, NJ',
   '1000 Atlantic Ave.',   'Camden',       'NJ', '08104', '(856) 365-1500', '(856) 365-1500',
   'https://share.google/f5aDULOQBRecDOF0a',
   '{"days_en":"Monday – Saturday","days_es":"Lunes – Sábado","time":"9:00 AM – 6:00 PM"}'::jsonb, 1),
  ('philadelphia-pa-eye-care', 'cuidado-de-la-vista-philadelphia-pa', 'Philadelphia, PA', 'Philadelphia, PA',
   '412 W Lehigh Ave.',    'Philadelphia', 'PA', '19133', '(215) 634-6567', '(215) 634-6567',
   'https://share.google/HQmGm5uaUVDqm5DN9',
   '{"days_en":"Monday – Saturday","days_es":"Lunes – Sábado","time":"9:00 AM – 6:00 PM"}'::jsonb, 2),
  ('cherry-hill-nj-eye-care',  'cuidado-de-la-vista-cherry-hill-nj',  'Cherry Hill, NJ',  'Cherry Hill, NJ',
   '122 HaddonTowne Ct.',  'Cherry Hill',  'NJ', '08034', '(856) 375-2454', '(856) 375-2454',
   'https://share.google/DhV7ONVylLjLGyVsu',
   '{"days_en":"Monday – Saturday","days_es":"Lunes – Sábado","time":"9:00 AM – 6:00 PM"}'::jsonb, 3);

-- =====================================================================
-- 3. PROVEEDORES CLÍNICOS (§48 — NO crear perfiles ficticios)
-- =====================================================================
create table public.providers (
  id            uuid primary key default uuid_generate_v4(),
  slug          text not null unique,
  full_name     text not null,
  credentials   text,
  specialty_en  text,
  specialty_es  text,
  bio_en        text,
  bio_es        text,
  languages     text[] not null default '{}',   -- sólo lo que confirme el negocio
  photo_media_id uuid,
  license_number text,                          -- mostrar sólo si el negocio lo pide
  display_license boolean not null default false,
  status        text not null default 'draft' check (status in ('draft','review','published')),
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.provider_locations (
  provider_id uuid not null references public.providers on delete cascade,
  location_id uuid not null references public.locations on delete cascade,
  primary key (provider_id, location_id)
);

-- =====================================================================
-- 4. SERVICIOS
-- =====================================================================
create table public.services (
  id             uuid primary key default uuid_generate_v4(),
  slug           text not null unique,
  slug_es        text not null unique,
  title_en       text not null,
  title_es       text not null,
  description_en text,
  description_es text,
  content_en     jsonb not null default '{}'::jsonb,
  content_es     jsonb not null default '{}'::jsonb,
  seo_en         jsonb not null default '{}'::jsonb,
  seo_es         jsonb not null default '{}'::jsonb,
  -- §11: distinguir qué se hace en consulta vs. sólo evaluación vs. referimiento
  availability   text not null default 'evaluation_only'
                 check (availability in ('in_office','evaluation_only','referral')),
  reviewed_by    text,          -- §35 "Medically reviewed by"
  reviewed_at    timestamptz,
  needs_verification boolean not null default true,
  active         boolean not null default false,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.service_locations (
  service_id  uuid not null references public.services on delete cascade,
  location_id uuid not null references public.locations on delete cascade,
  -- La disponibilidad puede diferir por oficina (§11)
  availability text not null default 'evaluation_only'
               check (availability in ('in_office','evaluation_only','referral','unavailable')),
  primary key (service_id, location_id)
);

-- =====================================================================
-- 5. SOLICITUDES DE CITA
-- =====================================================================
create type public.appointment_status as enum (
  'NEW','CONTACT_ATTEMPTED','PATIENT_REACHED','CONFIRMED',
  'RESCHEDULE_REQUESTED','CANCELLED','COMPLETED','NO_RESPONSE','SPAM'
);

create type public.appointment_reason as enum (
  'ROUTINE_EXAM','CONTACT_LENS_EXAM','EYEWEAR','PEDIATRIC_EXAM','DRY_EYE',
  'CORNEA_CONSULT','KERATOCONUS','GLAUCOMA_EVAL','CATARACT_EVAL','EYE_PROBLEM','OTHER'
);

create type public.communication_preference as enum ('CALL','TEXT','EMAIL');

create table public.appointment_requests (
  id            uuid primary key default uuid_generate_v4(),
  location_id   uuid not null references public.locations,
  patient_status text not null check (patient_status in ('new','existing')),
  first_name    text not null,
  last_name     text not null,
  phone         text not null,
  email         citext,
  preferred_date date,
  preferred_time text check (preferred_time in ('morning','afternoon')),
  reason        public.appointment_reason not null,
  -- Campo libre BREVE. La UI advierte de no incluir información médica.
  -- Límite duro para desincentivar historiales clínicos completos.
  notes         text check (char_length(notes) <= 500),
  communication_preference public.communication_preference not null,
  -- Consentimiento transaccional y de marketing SEPARADOS (§27, TCPA)
  sms_transactional_consent boolean not null default false,
  sms_marketing_consent     boolean not null default false,
  consent_timestamp   timestamptz,
  consent_language    text check (consent_language in ('en','es')),
  consent_version     text,
  status        public.appointment_status not null default 'NEW',
  assigned_to   uuid references auth.users,
  -- Metadatos antifraude. Se purgan por retención, ver 0002_retention.sql
  ip_address    inet,
  user_agent    text,
  spam_score    integer not null default 0,
  honeypot_triggered boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.appointment_activities (
  id             uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references public.appointment_requests on delete cascade,
  user_id        uuid references auth.users,
  action         text not null,   -- viewed | status_changed | assigned | notified
  previous_value text,
  new_value      text,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

-- =====================================================================
-- 6. MENSAJES DE CONTACTO
-- =====================================================================
create type public.contact_status as enum
  ('UNREAD','READ','IN_PROGRESS','REPLIED','CLOSED','SPAM');

create table public.contact_messages (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  email       citext not null,
  phone       text,
  location_id uuid references public.locations,
  subject     text not null,
  message     text not null check (char_length(message) <= 2000),
  status      public.contact_status not null default 'UNREAD',
  assigned_to uuid references auth.users,
  spam_score  integer not null default 0,
  honeypot_triggered boolean not null default false,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.communications (
  id                 uuid primary key default uuid_generate_v4(),
  contact_message_id uuid references public.contact_messages on delete cascade,
  appointment_id     uuid references public.appointment_requests on delete cascade,
  direction          text not null check (direction in ('inbound','outbound')),
  channel            text not null check (channel in ('web','email','sms','phone')),
  subject            text,
  content            text not null,
  sent_by            uuid references auth.users,
  provider_message_id text,
  delivery_status    text not null default 'pending'
                     check (delivery_status in ('pending','sent','delivered','failed')),
  created_at         timestamptz not null default now(),
  constraint communications_one_parent check (
    (contact_message_id is not null) <> (appointment_id is not null)
  )
);

-- =====================================================================
-- 7. REGISTROS DE CONSENTIMIENTO (§27)
-- =====================================================================
create table public.consent_records (
  id          uuid primary key default uuid_generate_v4(),
  type        text not null check (type in
              ('sms_transactional','sms_marketing','analytics','marketing_cookies')),
  granted     boolean not null,
  phone       text,
  email       citext,
  language    text not null check (language in ('en','es')),
  consent_text_version text not null,   -- versión exacta del texto mostrado
  source_page text,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- 8. NOTIFICACIONES (§52 — abstracción, no acoplada a Weave)
-- =====================================================================
create table public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  channel     text not null check (channel in ('admin_inbox','email','sms','weave','webhook')),
  provider    text,                       -- weave | resend | fallback
  location_id uuid references public.locations,
  object_type text not null,              -- appointment_request | contact_message
  object_id   uuid not null,
  -- NUNCA contiene datos clínicos. Sólo "revísalo en el portal" (§21).
  payload     jsonb not null default '{}'::jsonb,
  status      text not null default 'queued'
              check (status in ('queued','sent','delivered','failed','skipped')),
  attempts    integer not null default 0,
  last_error  text,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- 9. PROMOCIONES
-- =====================================================================
create type public.promotion_display_type as enum
  ('MODAL','CORNER','TOP_BAR','BOTTOM_BAR','INLINE');
create type public.promotion_status as enum
  ('DRAFT','SCHEDULED','ACTIVE','PAUSED','EXPIRED','ARCHIVED');

create table public.promotions (
  id              uuid primary key default uuid_generate_v4(),
  internal_name   text not null,
  title_en        text not null,
  title_es        text not null,
  description_en  text,
  description_es  text,
  media_id        uuid,
  image_alt_en    text,
  image_alt_es    text,
  cta_type        text not null default 'schedule' check (cta_type in
                  ('schedule','call','text','learn_more','view_offer','directions','custom')),
  cta_label_en    text,
  cta_label_es    text,
  destination_url text,
  location_target text[] not null default '{all}',
  page_target     text[] not null default '{all}',
  language_target text[] not null default '{en,es}',
  display_type    public.promotion_display_type not null default 'TOP_BAR',
  start_at        timestamptz,
  end_at          timestamptz,
  status          public.promotion_status not null default 'DRAFT',
  priority        integer not null default 0,
  frequency       text not null default 'once_24h' check (frequency in
                  ('once_session','once_visitor','once_24h','once_7d','every_visit')),
  trigger_type    text not null default 'delay'
                  check (trigger_type in ('delay','scroll','exit_intent','interaction')),
  delay_seconds   integer not null default 6,
  scroll_percent  integer,
  dismissible     boolean not null default true,
  offer_terms_en  text,   -- §90: "Restrictions may apply"
  offer_terms_es  text,
  is_demo         boolean not null default false,  -- §99
  created_by      uuid references auth.users,
  published_by    uuid references auth.users,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint promotions_date_order check (end_at is null or start_at is null or end_at > start_at)
);

-- Analítica de campaña. Sin identificadores de paciente (§92).
create table public.promotion_events (
  id           uuid primary key default uuid_generate_v4(),
  promotion_id uuid not null references public.promotions on delete cascade,
  event        text not null check (event in ('impression','click','cta_click','dismiss','appointment_start')),
  locale       text check (locale in ('en','es')),
  location_slug text,
  created_at   timestamptz not null default now()
);

-- =====================================================================
-- 10. PÁGINAS, SEO Y REDIRECCIONES
-- =====================================================================
create table public.pages (
  id           uuid primary key default uuid_generate_v4(),
  slug         text not null,
  locale       text not null check (locale in ('en','es')),
  title        text not null,
  content      jsonb not null default '{}'::jsonb,
  status       text not null default 'draft' check (status in ('draft','review','published')),
  -- §41: las páginas legales no se publican sin revisión jurídica
  legal_review_required boolean not null default false,
  legal_reviewed_by     text,
  legal_reviewed_at     timestamptz,
  published_at timestamptz,
  updated_by   uuid references auth.users,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (slug, locale),
  constraint pages_legal_gate check (
    status <> 'published' or legal_review_required = false or legal_reviewed_at is not null
  )
);

create table public.seo_data (
  id              uuid primary key default uuid_generate_v4(),
  page_id         uuid not null references public.pages on delete cascade unique,
  meta_title      text,
  meta_description text,
  og_title        text,
  og_description  text,
  og_image_url    text,
  canonical_url   text,
  noindex         boolean not null default false,
  schema_json     jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- §34: manifiesto de redirecciones 301 desde WordPress, editable en admin
create table public.redirects (
  id          uuid primary key default uuid_generate_v4(),
  source_path text not null unique,
  target_path text not null,
  status_code integer not null default 301 check (status_code in (301,302,308)),
  active      boolean not null default true,
  note        text,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- 11. FAQ Y ARTÍCULOS
-- =====================================================================
create table public.faqs (
  id          uuid primary key default uuid_generate_v4(),
  category    text,
  question_en text not null,
  question_es text not null,
  answer_en   text not null,
  answer_es   text not null,
  service_id  uuid references public.services on delete set null,
  location_id uuid references public.locations on delete set null,
  sort_order  integer not null default 0,
  active      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.articles (
  id          uuid primary key default uuid_generate_v4(),
  slug        text not null unique,
  slug_es     text not null unique,
  category    text,
  title_en    text not null,
  title_es    text not null,
  excerpt_en  text,
  excerpt_es  text,
  content_en  jsonb not null default '{}'::jsonb,
  content_es  jsonb not null default '{}'::jsonb,
  seo_en      jsonb not null default '{}'::jsonb,
  seo_es      jsonb not null default '{}'::jsonb,
  -- §35 YMYL: autoría y revisión médica obligatorias para publicar
  written_by  text,
  medically_reviewed_by text,
  medically_reviewed_at timestamptz,
  status      text not null default 'draft' check (status in ('draft','review','published')),
  published_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint articles_review_gate check (
    status <> 'published' or medically_reviewed_at is not null
  )
);

-- =====================================================================
-- 12. MEDIA
-- =====================================================================
create table public.media (
  id           uuid primary key default uuid_generate_v4(),
  storage_path text not null unique,
  file_name    text not null,
  mime_type    text not null,
  size_bytes   integer not null,
  width        integer,
  height       integer,
  alt_text_en  text,
  alt_text_es  text,
  caption_en   text,
  caption_es   text,
  created_by   uuid references auth.users,
  created_at   timestamptz not null default now()
);

alter table public.providers
  add constraint providers_photo_fk
  foreign key (photo_media_id) references public.media on delete set null;

alter table public.promotions
  add constraint promotions_media_fk
  foreign key (media_id) references public.media on delete set null;

-- =====================================================================
-- 13. AUDIT LOG (§51 — inmutable)
-- =====================================================================
create table public.audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users,
  action      text not null,
  object_type text not null,
  object_id   uuid,
  result      text not null default 'success' check (result in ('success','failure')),
  details     jsonb not null default '{}'::jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- Ni el personal ni los admins pueden alterar el histórico desde la API.
-- No existe política de update/delete: RLS lo deniega por defecto.
revoke update, delete on public.audit_logs from anon, authenticated;

-- =====================================================================
-- 14. CONFIGURACIÓN E INTEGRACIONES
-- =====================================================================
create table public.site_settings (
  id          uuid primary key default uuid_generate_v4(),
  key         text not null unique,
  value       jsonb not null,
  is_public   boolean not null default false,  -- sólo estas llegan al cliente
  description text,
  updated_by  uuid references auth.users,
  updated_at  timestamptz not null default now()
);

insert into public.site_settings (key, value, is_public, description) values
  ('legal_entity_name', '"Tus Ojos Inc."'::jsonb, true,
   'TODO: REQUIRES BUSINESS VERIFICATION — razón social por ubicación'),
  ('years_of_experience', 'null'::jsonb, true,
   'TODO: REQUIRES BUSINESS VERIFICATION — el contenido histórico menciona 30 años'),
  ('patients_served', 'null'::jsonb, true,
   'TODO: REQUIRES BUSINESS VERIFICATION — el contenido histórico menciona ~135,000'),
  ('ecommerce_enabled', 'false'::jsonb, false,
   'Venta de lentes de contacto desactivada al lanzamiento (§29)');

-- Credenciales de terceros. Ninguna política RLS: sólo service_role.
create table public.integrations (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null unique,
  provider       text not null,
  config         jsonb not null default '{}'::jsonb,
  active         boolean not null default false,
  last_tested_at timestamptz,
  last_test_result text,
  updated_by     uuid references auth.users,
  updated_at     timestamptz not null default now()
);

-- =====================================================================
-- 15. TRIGGERS
-- =====================================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'locations','providers','services','appointment_requests','contact_messages',
    'promotions','pages','seo_data','faqs','articles'
  ] loop
    execute format(
      'create trigger %I_updated_at before update on public.%I
       for each row execute function public.handle_updated_at();', t, t);
  end loop;
end $$;

-- =====================================================================
-- 16. ROW LEVEL SECURITY — ACTIVACIÓN TOTAL
-- Sin esto las políticas de abajo son decorativas.
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'roles','user_roles','locations','providers','provider_locations','services',
    'service_locations','appointment_requests','appointment_activities',
    'contact_messages','communications','consent_records','notifications',
    'promotions','promotion_events','pages','seo_data','redirects','faqs',
    'articles','media','audit_logs','site_settings','integrations'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 16.a LECTURA PÚBLICA
-- `to anon, authenticated`: si sólo pusiéramos `anon`, el personal logueado
-- dejaría de ver el contenido público del sitio.
-- ---------------------------------------------------------------------
create policy "public read locations" on public.locations
  for select to anon, authenticated using (active = true);

create policy "public read services" on public.services
  for select to anon, authenticated using (active = true);

create policy "public read service_locations" on public.service_locations
  for select to anon, authenticated using (true);

create policy "public read providers" on public.providers
  for select to anon, authenticated using (status = 'published');

create policy "public read provider_locations" on public.provider_locations
  for select to anon, authenticated using (true);

create policy "public read faqs" on public.faqs
  for select to anon, authenticated using (active = true);

create policy "public read pages" on public.pages
  for select to anon, authenticated using (status = 'published');

create policy "public read seo_data" on public.seo_data
  for select to anon, authenticated using (
    exists (select 1 from public.pages p where p.id = seo_data.page_id and p.status = 'published')
  );

create policy "public read articles" on public.articles
  for select to anon, authenticated using (status = 'published');

create policy "public read media" on public.media
  for select to anon, authenticated using (true);

create policy "public read redirects" on public.redirects
  for select to anon, authenticated using (active = true);

create policy "public read promotions" on public.promotions
  for select to anon, authenticated using (
    status = 'ACTIVE'
    and (start_at is null or start_at <= now())
    and (end_at  is null or end_at  >  now())
  );

create policy "public read public settings" on public.site_settings
  for select to anon, authenticated using (is_public = true);

-- NOTA DELIBERADA: no hay ninguna política de INSERT para `anon`.
-- appointment_requests, contact_messages, consent_records y promotion_events
-- se escriben desde route handlers con service_role, tras validar Turnstile,
-- honeypot y rate limit. Robar la anon key no permite escribir nada.

-- ---------------------------------------------------------------------
-- 16.b PERSONAL INTERNO
-- ---------------------------------------------------------------------
create policy "staff read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

create policy "admins manage roles" on public.user_roles
  for all to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER']));

create policy "staff read role catalog" on public.roles
  for select to authenticated using (public.is_staff());

-- Citas: SÓLO personal con rol asignado. Nunca `using (true)`.
create policy "staff read appointments" on public.appointment_requests
  for select to authenticated
  using (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK']));

create policy "staff update appointments" on public.appointment_requests
  for update to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK']));

create policy "staff read activities" on public.appointment_activities
  for select to authenticated
  using (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK']));

create policy "staff insert activities" on public.appointment_activities
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK'])
  );

create policy "staff manage contact messages" on public.contact_messages
  for select to authenticated
  using (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK']));

create policy "staff update contact messages" on public.contact_messages
  for update to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK']));

create policy "staff read communications" on public.communications
  for select to authenticated
  using (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK']));

create policy "staff write communications" on public.communications
  for insert to authenticated
  with check (
    sent_by = auth.uid()
    and public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK'])
  );

-- Consentimientos: lectura restringida, escritura sólo service_role.
create policy "admins read consent" on public.consent_records
  for select to authenticated
  using (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']));

create policy "staff read notifications" on public.notifications
  for select to authenticated
  using (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK']));

-- Contenido
create policy "editors manage pages" on public.pages
  for all to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','CONTENT_EDITOR','MANAGER']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','CONTENT_EDITOR','MANAGER']));

create policy "editors manage seo" on public.seo_data
  for all to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','CONTENT_EDITOR','MANAGER']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','CONTENT_EDITOR','MANAGER']));

create policy "editors manage articles" on public.articles
  for all to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','CONTENT_EDITOR','MANAGER']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','CONTENT_EDITOR','MANAGER']));

create policy "editors manage faqs" on public.faqs
  for all to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','CONTENT_EDITOR','MANAGER']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','CONTENT_EDITOR','MANAGER']));

create policy "editors manage media" on public.media
  for all to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','CONTENT_EDITOR','MANAGER']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','CONTENT_EDITOR','MANAGER']));

create policy "managers manage services" on public.services
  for all to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','CONTENT_EDITOR']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','CONTENT_EDITOR']));

create policy "managers manage service_locations" on public.service_locations
  for all to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']));

create policy "managers manage locations" on public.locations
  for all to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']));

create policy "managers manage providers" on public.providers
  for all to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']));

create policy "managers manage provider_locations" on public.provider_locations
  for all to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']));

create policy "managers manage redirects" on public.redirects
  for all to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']));

-- Promociones: §97. CONTENT_EDITOR crea borradores; sólo mandos publican.
create policy "staff read all promotions" on public.promotions
  for select to authenticated using (public.is_staff());

create policy "editors draft promotions" on public.promotions
  for insert to authenticated
  with check (
    status = 'DRAFT'
    and created_by = auth.uid()
    and public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','CONTENT_EDITOR'])
  );

create policy "managers publish promotions" on public.promotions
  for update to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']));

create policy "managers read promotion events" on public.promotion_events
  for select to authenticated
  using (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']));

-- Auditoría: lectura restringida a dirección. Sin update ni delete.
create policy "leadership read audit" on public.audit_logs
  for select to authenticated
  using (public.user_has_role(array['SUPER_ADMIN','OWNER']));

-- Ajustes del sitio
create policy "admins manage settings" on public.site_settings
  for all to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER']));

-- `integrations` NO tiene políticas a propósito: contiene credenciales.
-- Sólo accesible con service_role desde el servidor.

-- =====================================================================
-- 17. ÍNDICES
-- =====================================================================
create index idx_appointments_location  on public.appointment_requests(location_id);
create index idx_appointments_status    on public.appointment_requests(status);
create index idx_appointments_created   on public.appointment_requests(created_at desc);
create index idx_appointments_assigned  on public.appointment_requests(assigned_to);
create index idx_activities_appointment on public.appointment_activities(appointment_id);
create index idx_contact_status         on public.contact_messages(status);
create index idx_contact_created        on public.contact_messages(created_at desc);
create index idx_comms_contact          on public.communications(contact_message_id);
create index idx_comms_appointment      on public.communications(appointment_id);
create index idx_notifications_status   on public.notifications(status) where status in ('queued','failed');
create index idx_promotions_active      on public.promotions(status, start_at, end_at);
create index idx_promotion_events_promo on public.promotion_events(promotion_id, created_at desc);
create index idx_user_roles_user        on public.user_roles(user_id);
create index idx_audit_user             on public.audit_logs(user_id);
create index idx_audit_created          on public.audit_logs(created_at desc);
create index idx_pages_locale_status    on public.pages(locale, status);
create index idx_articles_status        on public.articles(status, published_at desc);
create index idx_redirects_source       on public.redirects(source_path) where active = true;
