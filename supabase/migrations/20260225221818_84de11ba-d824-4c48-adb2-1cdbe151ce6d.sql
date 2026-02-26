
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
    'paypal', jsonb_build_object(
      'enabled', COALESCE((value->'paypal'->>'enabled')::boolean, false),
      'client_id', COALESCE(value->'paypal'->>'client_id', ''),
      'sandbox', COALESCE((value->'paypal'->>'sandbox')::boolean, true)
    ),
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
