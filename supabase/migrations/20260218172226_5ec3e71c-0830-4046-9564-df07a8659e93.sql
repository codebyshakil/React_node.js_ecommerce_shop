
-- Create admin_settings table for sensitive configuration
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write admin_settings
CREATE POLICY "Admins manage admin settings"
  ON public.admin_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Move sensitive settings from site_settings to admin_settings
INSERT INTO public.admin_settings (key, value, updated_at)
SELECT key, value, updated_at FROM public.site_settings
WHERE key IN ('smtp_config', 'payment_methods')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;

-- Remove sensitive settings from public site_settings
DELETE FROM public.site_settings WHERE key IN ('smtp_config', 'payment_methods');

-- Add trigger for updated_at
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
