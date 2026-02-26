
-- Create variants table for reusable product attribute types
CREATE TABLE public.variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage variants" ON public.variants FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Variants are public read" ON public.variants FOR SELECT USING (true);

CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON public.variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
