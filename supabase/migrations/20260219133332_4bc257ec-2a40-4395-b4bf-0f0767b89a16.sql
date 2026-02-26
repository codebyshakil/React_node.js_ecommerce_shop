
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
    'cod', jsonb_build_object('enabled', COALESCE((value->'cod'->>'enabled')::boolean, false))
  )
  FROM public.admin_settings
  WHERE key = 'payment_methods'
  LIMIT 1;
$function$;
