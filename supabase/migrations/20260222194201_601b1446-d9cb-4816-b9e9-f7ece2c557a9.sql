
-- Create pages table for dynamic page management
CREATE TABLE public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT DEFAULT '',
  page_type TEXT NOT NULL DEFAULT 'custom',
  meta_description TEXT DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Admins manage pages
CREATE POLICY "Admins manage pages" ON public.pages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Published pages are public read
CREATE POLICY "Published pages are public read" ON public.pages FOR SELECT
  USING (is_published = true AND is_deleted = false);

-- Seed default pages
INSERT INTO public.pages (title, slug, content, page_type) VALUES
  ('About Us', 'about', '', 'about'),
  ('Terms & Conditions', 'terms', '', 'terms'),
  ('Privacy Policy', 'privacy-policy', '', 'privacy'),
  ('Return Policy', 'return-policy', '', 'returns'),
  ('FAQ', 'faq', '', 'faq');
