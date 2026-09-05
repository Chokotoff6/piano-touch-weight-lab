ALTER TABLE public.piano_actuel ADD COLUMN IF NOT EXISTS session_token text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.current_workshop_token()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(btrim(coalesce(
    current_setting('request.headers', true)::json ->> 'x-workshop-token',
    ''
  )), '');
$$;

DROP POLICY IF EXISTS "Anyone can insert current piano" ON public.piano_actuel;
DROP POLICY IF EXISTS "Anyone can update current piano" ON public.piano_actuel;

CREATE POLICY "Insert own workshop piano"
ON public.piano_actuel
FOR INSERT
TO anon, authenticated
WITH CHECK (
  public.current_workshop_token() IS NOT NULL
  AND session_token = public.current_workshop_token()
);

CREATE POLICY "Update own workshop piano"
ON public.piano_actuel
FOR UPDATE
TO anon, authenticated
USING (
  public.current_workshop_token() IS NOT NULL
  AND session_token = public.current_workshop_token()
)
WITH CHECK (
  public.current_workshop_token() IS NOT NULL
  AND session_token = public.current_workshop_token()
);

GRANT SELECT, INSERT, UPDATE ON public.piano_actuel TO anon, authenticated;
GRANT ALL ON public.piano_actuel TO service_role;