CREATE OR REPLACE FUNCTION public.insert_diagnostic(
  _user_fingerprint text,
  _marque text,
  _type_piano text,
  _modele text,
  _prefixe_lettre text,
  _numero_central text,
  _suffixe_lettre text,
  _annee_fabrication integer,
  _pays text,
  _ville text,
  _zone_climatique text,
  _type_entretien text,
  _remarques text,
  _mesures_wa jsonb,
  _mesures_wd jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF _user_fingerprint IS NULL OR length(btrim(_user_fingerprint)) = 0 THEN
    RAISE EXCEPTION 'fingerprint requis';
  END IF;
  IF _numero_central IS NULL OR length(btrim(_numero_central)) = 0 THEN
    RAISE EXCEPTION 'numero de serie requis';
  END IF;

  INSERT INTO public.pianos_diagnostics (
    user_fingerprint, marque, type_piano, modele, prefixe_lettre, numero_central,
    suffixe_lettre, annee_fabrication, pays, ville, zone_climatique, type_entretien,
    remarques, date_heure_saisie, mesures_wa, mesures_wd
  ) VALUES (
    _user_fingerprint, _marque, _type_piano, _modele, _prefixe_lettre, _numero_central,
    _suffixe_lettre, _annee_fabrication, _pays, _ville, _zone_climatique, _type_entretien,
    _remarques, now(), _mesures_wa, _mesures_wd
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_diagnostic(text,text,text,text,text,text,text,integer,text,text,text,text,text,jsonb,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.insert_diagnostic(text,text,text,text,text,text,text,integer,text,text,text,text,text,jsonb,jsonb) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_own_diagnostic(
  _id uuid,
  _user_fingerprint text,
  _marque text,
  _type_piano text,
  _modele text,
  _prefixe_lettre text,
  _numero_central text,
  _suffixe_lettre text,
  _annee_fabrication integer,
  _pays text,
  _ville text,
  _zone_climatique text,
  _type_entretien text,
  _remarques text,
  _mesures_wa jsonb,
  _mesures_wd jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_id uuid;
BEGIN
  IF _id IS NULL OR _user_fingerprint IS NULL OR length(btrim(_user_fingerprint)) = 0 THEN
    RETURN NULL;
  END IF;

  UPDATE public.pianos_diagnostics SET
    marque = _marque,
    type_piano = _type_piano,
    modele = _modele,
    prefixe_lettre = _prefixe_lettre,
    numero_central = _numero_central,
    suffixe_lettre = _suffixe_lettre,
    annee_fabrication = _annee_fabrication,
    pays = _pays,
    ville = _ville,
    zone_climatique = _zone_climatique,
    type_entretien = _type_entretien,
    remarques = _remarques,
    mesures_wa = _mesures_wa,
    mesures_wd = _mesures_wd
  WHERE id = _id
    AND user_fingerprint = _user_fingerprint
  RETURNING id INTO updated_id;

  RETURN updated_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_own_diagnostic(uuid,text,text,text,text,text,text,text,integer,text,text,text,text,text,jsonb,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.update_own_diagnostic(uuid,text,text,text,text,text,text,text,integer,text,text,text,text,text,jsonb,jsonb) TO anon, authenticated, service_role;