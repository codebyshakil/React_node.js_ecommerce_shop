
-- Site settings table for admin toggles
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT 'true'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default settings
INSERT INTO public.site_settings (key, value) VALUES
  ('payment_enabled', 'true'::jsonb),
  ('rfq_enabled', 'true'::jsonb),
  ('buy_now_enabled', 'true'::jsonb),
  ('maintenance_mode', 'false'::jsonb);

-- Add transaction_id to orders for payment tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS transaction_id text;
