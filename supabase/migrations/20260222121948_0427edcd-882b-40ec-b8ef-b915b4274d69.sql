
-- Add soft delete columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Add soft delete columns to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Add soft delete columns to variants
ALTER TABLE public.variants ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.variants ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
