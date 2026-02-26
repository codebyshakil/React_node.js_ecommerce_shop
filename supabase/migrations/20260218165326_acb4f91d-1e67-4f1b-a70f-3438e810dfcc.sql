
-- Create shipping zones table
CREATE TABLE public.shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'flat_rate', -- flat_rate, free_shipping, area_wise
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage shipping zones" ON public.shipping_zones FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Shipping zones public read" ON public.shipping_zones FOR SELECT USING (true);

CREATE TRIGGER update_shipping_zones_updated_at BEFORE UPDATE ON public.shipping_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create shipping rates table
CREATE TABLE public.shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  area_name text, -- e.g. "Dhaka", "Outside Dhaka", "International"
  country text,
  min_order_amount numeric DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  free_shipping_threshold numeric, -- free shipping if order >= this amount
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage shipping rates" ON public.shipping_rates FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Shipping rates public read" ON public.shipping_rates FOR SELECT USING (true);

-- Insert default shipping zone
INSERT INTO public.shipping_zones (name, type) VALUES ('Standard Shipping', 'flat_rate');

-- Insert default site settings for new features
INSERT INTO site_settings (key, value) VALUES
  ('site_title', '"PrimeTrade"'::jsonb),
  ('site_description', '"Premium quality products sourced worldwide"'::jsonb),
  ('site_logo_url', '""'::jsonb),
  ('favicon_url', '""'::jsonb),
  ('hero_slides', '[]'::jsonb),
  ('seo_meta_title', '"PrimeTrade - Premium Quality Products"'::jsonb),
  ('seo_meta_description', '"Your trusted partner for premium quality goods."'::jsonb),
  ('google_analytics_id', '""'::jsonb),
  ('facebook_pixel_id', '""'::jsonb),
  ('smtp_config', '{"host":"","port":"587","user":"","password":"","from_email":"","encryption":"tls"}'::jsonb),
  ('payment_methods', '{"sslcommerz":{"enabled":true,"store_id":"","store_password":"","sandbox":true},"bkash":{"enabled":false,"app_key":"","app_secret":"","username":"","password":"","sandbox":true},"cod":{"enabled":false}}'::jsonb),
  ('shipping_config', '{"flat_rate":60,"free_shipping_min":0,"cod_enabled":false}'::jsonb),
  ('social_links', '{"facebook":"","instagram":"","twitter":"","linkedin":"","youtube":""}'::jsonb),
  ('home_content', '{"hero_title":"Source the Finest Premium Products Worldwide","hero_subtitle":"Your trusted partner for premium quality goods.","hero_cta_text":"Shop Now","hero_cta_link":"/products","why_choose_us":[{"title":"Premium Quality","desc":"Every product is rigorously tested.","icon":"Award"},{"title":"Global Shipping","desc":"Fast shipping to 100+ countries.","icon":"Truck"},{"title":"Secure Payments","desc":"Bank-grade security encryption.","icon":"Shield"},{"title":"24/7 Support","desc":"Dedicated support team.","icon":"Headphones"}]}'::jsonb),
  ('terms_content', '""'::jsonb),
  ('privacy_content', '""'::jsonb),
  ('return_content', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;
