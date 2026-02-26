
-- Add soft delete columns to activity_logs
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
