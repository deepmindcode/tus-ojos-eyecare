-- 0011_rls_performance.sql
--
-- Rendimiento de las políticas de seguridad. NO cambia quién ve qué.
--
-- El problema: escrito `auth.uid()` suelto dentro de una política,
-- Postgres lo trata como algo que puede cambiar fila a fila y vuelve a
-- resolverlo en CADA fila examinada. Envuelto en `(select auth.uid())`
-- lo resuelve una vez y compara contra ese valor.
--
-- En una tabla de diez filas da igual. En `appointment_requests`, en el
-- directorio de clientes o al calcular el público de una campaña —miles
-- de filas por consulta— es la diferencia entre una consulta y miles.
--
-- Y pesa más de lo que parece porque `user_roles` y `user_locations` se
-- leen de rebote en casi todas las demás políticas: lo que se ahorra
-- aquí se ahorra en todo el panel.
--
-- Las condiciones son LETRA POR LETRA las mismas. Esto es un cambio de
-- cómo se evalúan, no de qué permiten.

ALTER POLICY "staff read own roles" ON public.user_roles
  USING (user_id = (select auth.uid()));

ALTER POLICY "staff read own locations" ON public.user_locations
  USING (user_id = (select auth.uid()) OR sees_all_locations());

ALTER POLICY "staff insert activities" ON public.appointment_activities
  WITH CHECK (
    user_id = (select auth.uid())
    AND user_has_role(ARRAY['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK'])
  );

ALTER POLICY "staff write communications" ON public.communications
  WITH CHECK (
    sent_by = (select auth.uid())
    AND user_has_role(ARRAY['SUPER_ADMIN','OWNER','MANAGER','FRONT_DESK'])
  );

ALTER POLICY "editors draft promotions" ON public.promotions
  WITH CHECK (
    status = 'DRAFT'::promotion_status
    AND created_by = (select auth.uid())
    AND user_has_role(ARRAY['SUPER_ADMIN','OWNER','MANAGER','CONTENT_EDITOR'])
  );

ALTER POLICY "editors draft offers" ON public.offers
  WITH CHECK (
    status = ANY (ARRAY['DRAFT'::offer_status,'LEGAL_REVIEW'::offer_status])
    AND created_by = (select auth.uid())
    AND user_has_role(ARRAY['SUPER_ADMIN','OWNER','MANAGER','CONTENT_EDITOR'])
  );

ALTER POLICY "own push subs read"   ON public.push_subscriptions
  USING (user_id = (select auth.uid()));
ALTER POLICY "own push subs delete" ON public.push_subscriptions
  USING (user_id = (select auth.uid()));
ALTER POLICY "own push subs insert" ON public.push_subscriptions
  WITH CHECK (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Índices de clave foránea que sí se usan.
--
-- El linter señala treinta y dos. La mayoría son columnas de "quién lo
-- creó" en tablas de veinte filas, donde un índice no ahorra nada y sí
-- cuesta en cada escritura. Se añaden sólo las cuatro que están en el
-- camino de consultas que ya se hacen a diario.
-- ---------------------------------------------------------------------

-- Se recorre en cada comprobación de rol, que es en cada consulta del panel.
CREATE INDEX IF NOT EXISTS user_roles_role_id_idx
  ON public.user_roles (role_id);

-- Igual, para el filtro por sede del personal de mostrador.
CREATE INDEX IF NOT EXISTS user_locations_location_id_idx
  ON public.user_locations (location_id);

-- El historial de una ficha resuelve el nombre de quien actuó.
CREATE INDEX IF NOT EXISTS appointment_activities_user_id_idx
  ON public.appointment_activities (user_id);

-- La bandeja filtra por sede, y el directorio de clientes la agrupa.
CREATE INDEX IF NOT EXISTS contact_messages_location_id_idx
  ON public.contact_messages (location_id);

-- ---------------------------------------------------------------------
-- PENDIENTE, a propósito.
--
-- `email_unsubscribes` tiene dos políticas de lectura idénticas:
-- "leadership read unsubscribes" (de una migración anterior) y
-- "leadership read unsubs" (que añadí en 0009 sin comprobar que ya
-- existía la otra). Dicen exactamente lo mismo, así que sobra una.
--
-- No se borra aquí porque borrar una política es destructivo y la
-- operación quedó sin autorizar. No corre prisa: dos políticas que
-- permiten lo mismo cuestan una evaluación de más sobre una tabla de
-- pocas filas, nada más. Para hacerlo:
--
--   DROP POLICY "leadership read unsubs" ON public.email_unsubscribes;
--
-- El resto de avisos de "multiple permissive policies" NO son un error:
-- son el par "lectura pública" + "gestión del personal" sobre tablas de
-- configuración de pocas filas. Unirlas significaría reescribir las
-- condiciones de acceso, que es donde se cometen los errores caros, a
-- cambio de microsegundos. Se dejan como están.
