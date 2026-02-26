
-- Add is_deleted column to profiles for soft delete
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- Add country_code column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code text DEFAULT '+880';
