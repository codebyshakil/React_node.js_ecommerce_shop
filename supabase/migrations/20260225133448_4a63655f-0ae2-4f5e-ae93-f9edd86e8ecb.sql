CREATE OR REPLACE FUNCTION public.find_order_by_partial_id(partial_id text)
RETURNS SETOF orders
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.orders
  WHERE id::text ILIKE partial_id || '%'
  LIMIT 1;
$$;