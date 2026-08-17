-- =====================================================================
-- TUS OJOS EYECARE — Migración 0002
-- supabase/migrations/0002_providers_offers_inbox.sql
--
-- Añade: perfiles de doctores/personal, sistema de cupones con canje
-- de un solo uso, y el hilo de respuesta de mensajes desde el admin.
-- Requiere 0001_init.sql.
-- =====================================================================

-- =====================================================================
-- 1. PERFILES DEL EQUIPO — distinguir alcance profesional
-- =====================================================================
-- Un óptico despacha lentes según receta; no realiza exámenes ni
-- diagnostica. La web NO debe insinuar lo contrario. Este campo controla
-- qué servicios se pueden atribuir a cada persona.
create type public.provider_type as enum (
  'OPTICIAN',        -- óptico: despacho de lentes y armazones
  'OPTOMETRIST',     -- optometrista (OD): exámenes y manejo primario
  'OPHTHALMOLOGIST', -- oftalmólogo (MD/DO): médico y quirúrgico
  'STAFF'            -- administración y recepción
);

alter table public.providers
  add column provider_type public.provider_type not null default 'STAFF',
  add column role_title_en text,
  add column role_title_es text,
  add column since_year integer check (since_year between 1900 and 2100),
  add column license_state text,
  -- Bloquea publicar a alguien como clínico sin verificar su licencia
  add column license_verified_at timestamptz,
  add constraint providers_clinical_license_gate check (
    status <> 'published'
    or provider_type in ('OPTICIAN','STAFF')
    or license_verified_at is not null
  );

-- Dato confirmado por el dueño del negocio (agosto 2026).
insert into public.providers
  (slug, full_name, provider_type, role_title_en, role_title_es,
   specialty_en, specialty_es, since_year, languages, status,
   bio_en, bio_es)
values (
  'wilfredo-manzano',
  'Wilfredo Manzano',
  'OPTICIAN',
  'Optician · Owner · President',
  'Óptico · Propietario · Presidente',
  'Eyewear, prescription lenses and lens treatments',
  'Armazones, micas recetadas y tratamientos de lentes',
  1996,
  array['English','Español'],
  'draft',   -- se publica cuando el negocio apruebe el texto final
  'Wilfredo Manzano has fitted eyewear for families across Philadelphia and South Jersey since 1996. He works with patients on frame selection, prescription lenses and lens treatments, with particular attention to strong and complex prescriptions.',
  'Wilfredo Manzano ha adaptado lentes para familias de Philadelphia y el sur de Nueva Jersey desde 1996. Trabaja con los pacientes en la selección de armazones, micas recetadas y tratamientos, con especial atención a las graduaciones fuertes y complejas.'
);

-- TODO: REQUIRES BUSINESS VERIFICATION
-- Falta el/los optometrista(s) que realizan los exámenes. Sin ese
-- registro, las páginas de examen no deben pasar a 'published'.

-- =====================================================================
-- 2. DATOS DEL NEGOCIO CONFIRMADOS
-- =====================================================================
update public.site_settings set
  value = '30'::jsonb,
  description = 'Confirmado por el dueño: operando desde 1996'
where key = 'years_of_experience';

update public.site_settings set
  value = '120000'::jsonb,
  description = 'Confirmado por el dueño. ATENCIÓN: el WordPress actual dice 135,000. Unificar en web, Google Business y redes antes de publicar.'
where key = 'patients_served';

insert into public.site_settings (key, value, is_public, description) values
  ('founded_year', '1996'::jsonb, true, 'Confirmado por el dueño'),
  ('coupon_legal_review_required', 'true'::jsonb, false,
   'Toda oferta sobre servicios facturables requiere revisión legal antes de activarse');

-- =====================================================================
-- 3. OFERTAS Y CUPONES
-- =====================================================================
create type public.offer_status as enum
  ('DRAFT','LEGAL_REVIEW','SCHEDULED','ACTIVE','PAUSED','EXPIRED','ARCHIVED');

create type public.offer_applies_to as enum (
  'FRAMES',        -- armazones
  'LENSES',        -- micas y tratamientos
  'SUNGLASSES',
  'CONTACT_LENSES',
  'ACCESSORIES',
  'BILLABLE_SERVICE' -- ⚠ requiere revisión legal, ver constraint
);

create table public.offers (
  id             uuid primary key default uuid_generate_v4(),
  internal_name  text not null,
  -- Código público de campaña: el que se dice en radio o Instagram.
  -- No es único por persona; sirve para alcance, no para control.
  campaign_code  text unique,
  title_en       text not null,
  title_es       text not null,
  description_en text,
  description_es text,
  -- §90: los términos NUNCA pueden vivir sólo dentro de una imagen
  terms_en       text not null,
  terms_es       text not null,
  media_id       uuid references public.media on delete set null,
  image_alt_en   text,
  image_alt_es   text,
  discount_type  text not null check (discount_type in ('percent','fixed_amount','bogo','other')),
  discount_value numeric(10,2),
  applies_to     public.offer_applies_to[] not null default '{FRAMES}',
  location_target text[] not null default '{all}',
  language_target text[] not null default '{en,es}',
  start_at       timestamptz,
  end_at         timestamptz,
  status         public.offer_status not null default 'DRAFT',
  -- Control: emite código único por persona, o basta el código de campaña
  issues_unique_codes boolean not null default true,
  max_total_claims    integer,
  max_per_person      integer not null default 1,
  -- Revisión legal
  legal_review_required boolean not null default false,
  legal_reviewed_by     text,
  legal_reviewed_at     timestamptz,
  created_by     uuid references auth.users,
  published_by   uuid references auth.users,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint offers_date_order check (end_at is null or start_at is null or end_at > start_at),
  -- Descontar un servicio facturable a un seguro puede implicar reglas
  -- federales de inducción al beneficiario. No se activa sin revisión.
  constraint offers_billable_gate check (
    not ('BILLABLE_SERVICE' = any(applies_to))
    or status in ('DRAFT','LEGAL_REVIEW','ARCHIVED')
    or legal_reviewed_at is not null
  )
);

-- ---------------------------------------------------------------------
-- Reclamos: un registro por persona que pide el cupón.
-- IMPORTANTE: esta tabla NO guarda motivo de visita ni dato clínico.
-- Un cupón es una transacción comercial, no un registro de salud.
-- ---------------------------------------------------------------------
create type public.claim_status as enum ('ISSUED','REDEEMED','EXPIRED','VOID');

create table public.offer_claims (
  id            uuid primary key default uuid_generate_v4(),
  offer_id      uuid not null references public.offers on delete cascade,
  -- Código de un solo uso. Se genera en el servidor, legible por teléfono:
  -- formato TO-XXXX-XXXX sin caracteres ambiguos (0/O, 1/I).
  code          text not null unique,
  first_name    text not null,
  last_name     text not null,
  phone         text,
  email         citext,
  preferred_location_id uuid references public.locations,
  language      text not null check (language in ('en','es')),
  -- Consentimiento de MARKETING, separado del transaccional (TCPA)
  sms_marketing_consent   boolean not null default false,
  email_marketing_consent boolean not null default false,
  consent_timestamp       timestamptz,
  consent_text_version    text,
  delivery_channel text check (delivery_channel in ('screen','sms','email')),
  delivered_at  timestamptz,
  status        public.claim_status not null default 'ISSUED',
  expires_at    timestamptz,
  -- Canje: quién, cuándo y en qué sede
  redeemed_at   timestamptz,
  redeemed_by   uuid references auth.users,
  redeemed_location_id uuid references public.locations,
  redemption_note text,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz not null default now(),
  constraint claims_redemption_complete check (
    status <> 'REDEEMED' or (redeemed_at is not null and redeemed_by is not null)
  ),
  constraint claims_contact_present check (phone is not null or email is not null)
);

-- Un cupón no se puede canjear dos veces: la transición a REDEEMED
-- sólo ocurre desde ISSUED, verificado por trigger.
create or replace function public.guard_claim_redemption()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'REDEEMED' and old.status <> 'ISSUED' then
    raise exception 'El cupón % ya fue procesado (estado: %)', old.code, old.status;
  end if;
  if new.status = 'REDEEMED' and old.expires_at is not null and old.expires_at < now() then
    raise exception 'El cupón % venció el %', old.code, old.expires_at;
  end if;
  return new;
end;
$$;

create trigger offer_claims_guard
  before update on public.offer_claims
  for each row execute function public.guard_claim_redemption();

create trigger offers_updated_at before update on public.offers
  for each row execute function public.handle_updated_at();

-- =====================================================================
-- 4. BANDEJA DE ENTRADA: RESPONDER DESDE EL ADMIN
-- =====================================================================
-- El envío sale por un proveedor transaccional (Resend/Postmark) desde
-- el servidor. Las credenciales viven en `integrations`, nunca aquí.
alter table public.communications
  add column thread_id uuid,
  add column reply_to_email citext,
  add column provider_error text,
  add column opened_at timestamptz;

-- Agrupa el hilo: el primer mensaje define el thread_id de los demás.
create index idx_comms_thread on public.communications(thread_id, created_at);

-- Estado de entrega visible para el equipo: si un correo rebota, la
-- recepción tiene que enterarse, no asumir que el paciente lo recibió.
comment on column public.communications.delivery_status is
  'pending → sent → delivered | failed. Lo actualiza el webhook del proveedor de correo.';

-- =====================================================================
-- 5. RLS
-- =====================================================================
alter table public.offers enable row level security;
alter table public.offers force row level security;
alter table public.offer_claims enable row level security;
alter table public.offer_claims force row level security;

-- El público ve las ofertas activas y vigentes. Nunca los reclamos.
create policy "public read active offers" on public.offers
  for select to anon, authenticated using (
    status = 'ACTIVE'
    and (start_at is null or start_at <= now())
    and (end_at  is null or end_at  >  now())
  );

-- NO hay política de insert para anon en offer_claims: el reclamo se
-- crea desde un route handler con service_role, tras validar Turnstile,
-- rate limit y el tope de max_per_person. Si esto fuera insertable con
-- la anon key, un bot vaciaría la campaña en segundos.

create policy "staff read offers" on public.offers
  for select to authenticated using (public.is_staff());

create policy "editors draft offers" on public.offers
  for insert to authenticated with check (
    status in ('DRAFT','LEGAL_REVIEW')
    and created_by = auth.uid()
    and public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','CONTENT_EDITOR'])
  );

create policy "managers manage offers" on public.offers
  for update to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER']));

-- La recepción necesita buscar y canjear cupones, pero no exportarlos:
-- el listado completo queda para dirección.
create policy "staff read claims" on public.offer_claims
  for select to authenticated
  using (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK']));

create policy "staff redeem claims" on public.offer_claims
  for update to authenticated
  using      (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK']))
  with check (public.user_has_role(array['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK']));

-- =====================================================================
-- 6. ÍNDICES
-- =====================================================================
create index idx_offers_active  on public.offers(status, start_at, end_at);
create index idx_claims_offer   on public.offer_claims(offer_id, status);
create index idx_claims_code    on public.offer_claims(code);
create index idx_claims_phone   on public.offer_claims(phone);
create index idx_claims_created on public.offer_claims(created_at desc);
create index idx_providers_type on public.providers(provider_type, status);
