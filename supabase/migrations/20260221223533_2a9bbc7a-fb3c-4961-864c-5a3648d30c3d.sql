
-- Add queue control columns to email_campaigns
ALTER TABLE public.email_campaigns
ADD COLUMN IF NOT EXISTS total_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS send_interval_minutes integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_paused boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS error_log text DEFAULT '';
