
-- Create page_sections table for per-page section builder
CREATE TABLE public.page_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL DEFAULT 'text_block',
  title TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  settings_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_page_sections_page_id ON public.page_sections(page_id);
CREATE INDEX idx_page_sections_order ON public.page_sections(page_id, display_order);

-- Enable RLS
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins manage page sections"
  ON public.page_sections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Published page sections are public read"
  ON public.page_sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.pages
    WHERE pages.id = page_sections.page_id
    AND pages.is_published = true
    AND pages.is_deleted = false
  ));

-- Trigger for updated_at
CREATE TRIGGER update_page_sections_updated_at
  BEFORE UPDATE ON public.page_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
