CREATE TABLE public.pianos_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_fingerprint text NOT NULL,
  marque text,
  type_piano text,
  modele text,
  prefixe_lettre text,
  numero_central text,
  suffixe_lettre text,
  annee_fabrication integer,
  pays text,
  ville text,
  zone_climatique text,
  type_entretien text,
  remarques text,
  date_heure_saisie timestamptz NOT NULL DEFAULT now(),
  mesures_wa jsonb,
  mesures_wd jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pianos_diagnostics_fingerprint ON public.pianos_diagnostics (user_fingerprint);
CREATE INDEX idx_pianos_diagnostics_numero ON public.pianos_diagnostics (numero_central);

GRANT INSERT ON public.pianos_diagnostics TO anon, authenticated;
GRANT ALL ON public.pianos_diagnostics TO service_role;

ALTER TABLE public.pianos_diagnostics ENABLE ROW LEVEL SECURITY;

-- Insertion ouverte à tous (collaboration gratuite)
CREATE POLICY "Anyone can insert diagnostics"
ON public.pianos_diagnostics
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Aucune politique SELECT : la lecture directe de la table est impossible.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_pianos_diagnostics_updated_at
BEFORE UPDATE ON public.pianos_diagnostics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lecture strictement conditionnée : empreinte navigateur ET numéro de série exacts
CREATE OR REPLACE FUNCTION public.get_own_diagnostics(_user_fingerprint text, _numero_central text)
RETURNS SETOF public.pianos_diagnostics
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.pianos_diagnostics
  WHERE _user_fingerprint IS NOT NULL
    AND _numero_central IS NOT NULL
    AND length(btrim(_user_fingerprint)) > 0
    AND length(btrim(_numero_central)) > 0
    AND user_fingerprint = _user_fingerprint
    AND numero_central = _numero_central;
$$;

REVOKE ALL ON FUNCTION public.get_own_diagnostics(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_own_diagnostics(text, text) TO anon, authenticated, service_role;