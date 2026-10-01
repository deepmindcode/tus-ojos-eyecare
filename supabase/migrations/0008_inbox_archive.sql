-- =====================================================================
-- TUS OJOS EYECARE — Migración 0008
-- supabase/migrations/0008_inbox_archive.sql
--
-- Archivar mensajes sin perderlos.
--
-- Un mensaje de un paciente es un registro de qué preguntó y qué se le
-- contestó. Archivar lo saca de la vista; borrar lo destruye. Por eso
-- lo normal es archivar, y borrar queda como excepción para el spam.
-- =====================================================================

alter table public.contact_messages
  add column archived_at timestamptz,
  add column archived_by uuid references auth.users;

-- Índice parcial: las consultas normales piden "lo no archivado", y
-- este índice las cubre sin cargar con las filas archivadas.
create index idx_contact_active
  on public.contact_messages (created_at desc)
  where archived_at is null;

create index idx_contact_archived
  on public.contact_messages (archived_at desc)
  where archived_at is not null;