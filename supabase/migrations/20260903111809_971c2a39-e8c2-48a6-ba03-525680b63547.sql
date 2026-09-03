CREATE TABLE public.piano_actuel (
  id text PRIMARY KEY,
  brand text,
  model text,
  serial_number text,
  type_piano text,
  mesure_date date,
  manufacture_year integer,
  climate_zone text,
  maintenance_type text,
  usage_level text,
  ville text,
  pays text,
  remarques text,
  wa_values numeric[] NOT NULL DEFAULT '{}',
  wd_values numeric[] NOT NULL DEFAULT '{}',
  friction_values numeric[] NOT NULL DEFAULT '{}',
  balance_values numeric[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.piano_actuel TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.piano_actuel TO authenticated;
GRANT ALL ON public.piano_actuel TO service_role;

ALTER TABLE public.piano_actuel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read current piano" ON public.piano_actuel FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert current piano" ON public.piano_actuel FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update current piano" ON public.piano_actuel FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_piano_actuel_updated_at
BEFORE UPDATE ON public.piano_actuel
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();