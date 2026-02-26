
-- Add soft delete columns to email_campaigns
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Auto-delete trashed campaigns after 30 days (pg_cron job)
SELECT cron.schedule(
  'cleanup-trashed-campaigns',
  '0 3 * * *',
  $$DELETE FROM public.email_campaigns WHERE is_deleted = true AND deleted_at < now() - interval '30 days'$$
);
