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
