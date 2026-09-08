-- 1. piano_actuel : suppression des règles basées sur un en-tête falsifiable
DROP POLICY IF EXISTS "Insert own workshop piano" ON public.piano_actuel;
DROP POLICY IF EXISTS "Read own workshop piano" ON public.piano_actuel;
DROP POLICY IF EXISTS "Update own workshop piano" ON public.piano_actuel;
REVOKE ALL ON public.piano_actuel FROM anon, authenticated;
GRANT ALL ON public.piano_actuel TO service_role;
ALTER TABLE public.piano_actuel ENABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS public.current_workshop_token();

-- 2. piano_profiles : plus de lecture publique
DROP POLICY IF EXISTS "Public read piano profiles" ON public.piano_profiles;
REVOKE ALL ON public.piano_profiles FROM anon, authenticated;
GRANT ALL ON public.piano_profiles TO service_role;
ALTER TABLE public.piano_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Fonctions SECURITY DEFINER : plus exposées à l'API publique
REVOKE ALL ON FUNCTION public.get_own_diagnostics(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.insert_diagnostic(text, text, text, text, text, text, text, integer, text, text, text, text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_own_diagnostic(uuid, text, text, text, text, text, text, text, integer, text, text, text, text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;

-- 4. pianos_diagnostics : accès serveur uniquement (l'app passe par le serveur)
DROP POLICY IF EXISTS "Anyone can insert diagnostics" ON public.pianos_diagnostics;
REVOKE ALL ON public.pianos_diagnostics FROM anon, authenticated;
GRANT ALL ON public.pianos_diagnostics TO service_role;
ALTER TABLE public.pianos_diagnostics ENABLE ROW LEVEL SECURITY;