-- 0010_push_subscriptions.sql
--
-- Avisos push al teléfono o al ordenador del equipo.
--
-- Qué se guarda y qué no:
--
--   Una suscripción push es una URL que el navegador entrega al sitio
--   para que le mande avisos. No es un identificador de persona ni lleva
--   datos del paciente: es un buzón. Aun así se guarda atada al usuario
--   que la creó, porque al cerrar sesión o al quitarle el acceso a
--   alguien hay que poder dejar de escribirle al bolsillo.
--
--   `endpoint` es la clave: un mismo navegador renueva su suscripción de
--   vez en cuando, y sin unicidad se acumularían buzones muertos a los
--   que el envío falla una y otra vez.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  -- Para poder decirle a la persona cuáles de sus aparatos están dados
  -- de alta, sin tener que adivinarlo por la URL del buzón.
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_ok_at timestamptz
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Cada cual ve y gestiona SOLO sus propios aparatos. Ni siquiera
-- dirección ve los de los demás: no hay nada que supervisar ahí, y una
-- lista de los dispositivos de todo el equipo no aporta nada que
-- justifique guardarla al alcance de nadie más.
DO $$ BEGIN
  CREATE POLICY "own push subs read" ON public.push_subscriptions
    FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "own push subs insert" ON public.push_subscriptions
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "own push subs delete" ON public.push_subscriptions
    FOR DELETE TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- El envío lo hace el servidor con service_role: tiene que poder escribir
-- a los buzones de TODO el equipo cuando entra una cita, y eso no es una
-- acción de ningún usuario en concreto.
