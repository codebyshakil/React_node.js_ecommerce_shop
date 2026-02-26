
-- Add last_ip and ip_blocked_at columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_ip text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ip_blocked_at timestamp with time zone;
