
-- Create homepage_sections table for dynamic section management
CREATE TABLE public.homepage_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  subtitle text DEFAULT '',
  is_enabled boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  layout_type text NOT NULL DEFAULT 'grid',
  product_source text DEFAULT 'latest',
  selected_ids jsonb DEFAULT '[]'::jsonb,
  item_limit integer DEFAULT 4,
  settings_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Homepage sections are public read"
ON public.homepage_sections FOR SELECT
USING (true);

-- Admins manage
CREATE POLICY "Admins manage homepage sections"
ON public.homepage_sections FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_homepage_sections_updated_at
BEFORE UPDATE ON public.homepage_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default sections
INSERT INTO public.homepage_sections (section_key, title, subtitle, is_enabled, display_order, layout_type, product_source, item_limit, settings_json) VALUES
('hero', 'Hero', '', true, 0, 'slider', null, null, '{}'::jsonb),
('featured_products', 'Featured Products', 'Handpicked premium products for you', true, 1, 'grid', 'latest', 4, '{"show_ratings": true, "show_discount_badge": true, "show_wishlist": false, "show_quick_view": false}'::jsonb),
('categories', 'Featured Categories', 'Explore our curated collection of premium products', true, 2, 'grid', null, 6, '{"show_product_count": false, "sort_by": "custom"}'::jsonb),
('flash_sale', 'Flash Sale', 'Limited time offers — grab them before they are gone!', false, 3, 'grid', 'manual', 4, '{"end_date": "", "auto_hide_expired": true, "banner_image": "", "bg_color": "", "discount_override": null}'::jsonb),
('why_choose_us', 'Why Choose Us', 'What sets us apart from the rest', true, 4, 'grid', null, 4, '{}'),
('blog', 'Latest from Our Blog', 'Recipes, tips, and industry insights', true, 5, 'grid', null, 3, '{}'),
('testimonials', 'What Our Clients Say', 'Trusted by businesses worldwide', true, 6, 'slider', null, null, '{}'),
('partners', 'Trusted by Leading Brands', '', true, 7, 'horizontal', null, null, '{}'),
('cta', 'Ready to Get Started?', 'Browse our premium product catalog and discover excellence in every product.', true, 8, 'default', null, null, '{}');
