
-- Add status field to blog_posts (published, unpublished, draft)
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Migrate existing data: is_published=true → 'published', false → 'draft'
UPDATE public.blog_posts SET status = CASE WHEN is_published = true THEN 'published' ELSE 'draft' END;

-- Add soft delete columns to testimonials
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Add soft delete columns to contact_messages
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
