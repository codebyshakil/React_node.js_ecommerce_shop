CREATE POLICY "Public can read payment methods"
ON public.admin_settings
FOR SELECT
USING (key = 'payment_methods');