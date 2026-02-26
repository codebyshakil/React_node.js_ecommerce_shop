-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can read payment methods" ON public.admin_settings;

-- Create a secure function that returns only enabled flags
CREATE OR REPLACE FUNCTION public.get_enabled_payment_methods()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'sslcommerz', jsonb_build_object('enabled', COALESCE((value->'sslcommerz'->>'enabled')::boolean, false)),
    'bkash', jsonb_build_object('enabled', COALESCE((value->'bkash'->>'enabled')::boolean, false)),
    'cod', jsonb_build_object('enabled', COALESCE((value->'cod'->>'enabled')::boolean, false))
  )
  FROM public.admin_settings
  WHERE key = 'payment_methods'
  LIMIT 1;
$$;