DROP POLICY IF EXISTS "Anyone can read current piano" ON public.piano_actuel;
CREATE POLICY "Read own workshop piano" ON public.piano_actuel
FOR SELECT TO anon, authenticated
USING ((current_workshop_token() IS NOT NULL) AND (session_token = current_workshop_token()));