-- 0009_campaigns.sql
--
-- Envíos a grupos de clientes: ofertas y seguimientos.
--
-- Tres decisiones que conviene no deshacer:
--
--   1. Las bajas se guardan por CORREO, no por cliente. La persona pide
--      no recibir nada en esa dirección, y eso vale aunque mañana vuelva
--      a escribir con otro nombre o desde otra ficha.
--
--   2. De la campaña se guarda el CRITERIO del público (sede, motivo), no
--      la lista de destinatarios. Así, si alguien se da de baja entre dos
--      tandas, la siguiente ya no le escribe.
--
--   3. `campaign_sends` lleva una clave única por campaña y correo. Es lo
--      que impide que al reenviar una tanda le llegue dos veces a la
--      misma persona: la base lo rechaza, no hace falta acordarse.

CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  email       citext PRIMARY KEY,
  source      text NOT NULL DEFAULT 'link',
  campaign_id uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('DRAFT','SENDING','PAUSED','SENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.campaigns (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         text NOT NULL,
  subject_en   text NOT NULL,
  subject_es   text NOT NULL,
  body_en      text NOT NULL,
  body_es      text NOT NULL,
  location_id  uuid REFERENCES public.locations(id),
  reason       appointment_reason,
  promotion_id uuid REFERENCES public.promotions(id),
  status       campaign_status NOT NULL DEFAULT 'DRAFT',
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_sends (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  email       citext NOT NULL,
  name        text,
  status      text NOT NULL DEFAULT 'SENT',
  provider_id text,
  error       text,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email)
);

CREATE INDEX IF NOT EXISTS campaign_sends_campaign_idx ON public.campaign_sends (campaign_id);

ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_sends     ENABLE ROW LEVEL SECURITY;

-- Sólo dirección: una campaña escribe a cientos de personas en nombre del
-- negocio, no es una acción de mostrador. Las escrituras van por
-- service_role desde las acciones del servidor, igual que las citas.
DO $$ BEGIN
  CREATE POLICY "leadership manage campaigns" ON public.campaigns
    FOR ALL USING (user_has_role(ARRAY['SUPER_ADMIN','OWNER']))
    WITH CHECK (user_has_role(ARRAY['SUPER_ADMIN','OWNER']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "leadership read sends" ON public.campaign_sends
    FOR SELECT USING (user_has_role(ARRAY['SUPER_ADMIN','OWNER']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "leadership read unsubs" ON public.email_unsubscribes
    FOR SELECT USING (user_has_role(ARRAY['SUPER_ADMIN','OWNER']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- La sede pasa a ser opcional SÓLO por los registros históricos
-- importados del sitio anterior, cuyo formulario no la preguntaba.
ALTER TABLE public.appointment_requests ALTER COLUMN location_id DROP NOT NULL;

-- Una oferta tiene DOS destinos independientes: la ventana emergente del
-- sitio y las campañas por correo. Antes eran lo mismo, así que toda
-- promoción publicada salía en la web y no había forma de premiar a quien
-- recibe el correo con algo que el resto no ve.
--
-- `allow_campaign` por defecto en false a propósito: una oferta que ya
-- existe para la web no empieza a mandarse por correo porque sí; alguien
-- tiene que marcarlo.
ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS show_popup     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_campaign boolean NOT NULL DEFAULT false;

-- Sólo el POPUP mira `show_popup`. `get_active_promotion`, que resuelve
-- por slug cuando alguien llega desde el enlace del correo, NO lo mira:
-- un descuento exclusivo de la campaña tiene que quedar anotado en la
-- cita aunque no se muestre nunca en el sitio.
CREATE OR REPLACE FUNCTION public.get_promotion_for_page(p_path text, p_locale text)
 RETURNS TABLE(id uuid, slug text, title text, description text, discount_label text, terms text, cta_type text, cta_label text, display_type promotion_display_type, delay_seconds integer, dismissible boolean, frequency text, exclusive_location_slug text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
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
    and p.show_popup
    and (p.start_at is null or p.start_at <= now())
    and (p.end_at   is null or p.end_at   >  now())
    and p_locale = any (p.language_target)
    and ('all' = any (p.page_target) or p_path = any (p.page_target))
    and p_path not like '/legal%'
    and p_path not like '/appointment%'
    and p_path not like '/admin%'
  order by p.priority desc, p.created_at desc
  limit 1;
$function$;
