
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule auto-delete of trashed pages after 30 days (runs daily at 3 AM)
SELECT cron.schedule(
  'auto-delete-trashed-pages',
  '0 3 * * *',
  $$DELETE FROM public.pages WHERE is_deleted = true AND deleted_at < now() - interval '30 days';$$
);
