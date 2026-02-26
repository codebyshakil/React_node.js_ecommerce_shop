
-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload screenshots
CREATE POLICY "Users can upload payment screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-screenshots' AND auth.uid() IS NOT NULL);

-- Allow public read for screenshots (admins need to view them)
CREATE POLICY "Payment screenshots are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-screenshots');

-- Allow admins to delete screenshots
CREATE POLICY "Admins can delete payment screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-screenshots' AND public.has_role(auth.uid(), 'admin'));

-- Update get_enabled_payment_methods to include manual_payment
CREATE OR REPLACE FUNCTION public.get_enabled_payment_methods()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'sslcommerz', jsonb_build_object('enabled', COALESCE((value->'sslcommerz'->>'enabled')::boolean, false)),
    'bkash', jsonb_build_object('enabled', COALESCE((value->'bkash'->>'enabled')::boolean, false)),
    'nagad', jsonb_build_object('enabled', COALESCE((value->'nagad'->>'enabled')::boolean, false)),
    'cod', jsonb_build_object('enabled', COALESCE((value->'cod'->>'enabled')::boolean, false)),
    'manual_payment', jsonb_build_object(
      'enabled', COALESCE((value->'manual_payment'->>'enabled')::boolean, false),
      'gateway_name', COALESCE(value->'manual_payment'->>'gateway_name', 'Manual Payment'),
      'description', COALESCE(value->'manual_payment'->>'description', ''),
      'instruction', COALESCE(value->'manual_payment'->>'instruction', ''),
      'accounts', COALESCE(value->'manual_payment'->'accounts', '[]'::jsonb)
    )
  )
  FROM public.admin_settings
  WHERE key = 'payment_methods'
  LIMIT 1;
$function$;
