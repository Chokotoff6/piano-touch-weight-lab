CREATE OR REPLACE FUNCTION public.current_workshop_token()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT nullif(btrim(coalesce(
    current_setting('request.headers', true)::json ->> 'x-workshop-token',
    ''
  )), '');
$$;