
CREATE TABLE public.piano_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number text NOT NULL UNIQUE,
  marque text,
  modele text,
  wa_values numeric[] NOT NULL,
  wd_values numeric[] NOT NULL,
  friction_values numeric[] NOT NULL,
  balance_values numeric[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.piano_profiles TO anon;
GRANT SELECT ON public.piano_profiles TO authenticated;
GRANT ALL ON public.piano_profiles TO service_role;

ALTER TABLE public.piano_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read piano profiles"
ON public.piano_profiles FOR SELECT TO anon, authenticated USING (true);

-- Notes échantillonnées : 4,10,16,22,28,34,40,46,52,58,64,70,76,82,88
INSERT INTO public.piano_profiles (serial_number, marque, modele, wa_values, wd_values, friction_values, balance_values) VALUES
('MOCK-MON-PIANO', 'YAMAHA', 'U3',
 ARRAY[52.0,50.5,49.0,47.5,46.0,44.5,43.0,41.5,40.0,38.5,37.0,36.0,35.0,34.5,34.0],
 ARRAY[39.5,38.2,37.0,35.8,34.6,33.5,32.4,31.3,30.2,29.2,28.2,27.4,26.6,26.2,25.8],
 ARRAY[6.3,6.2,6.0,5.9,5.7,5.5,5.3,5.1,4.9,4.7,4.4,4.3,4.2,4.2,4.1],
 ARRAY[45.8,44.4,43.0,41.7,40.3,39.0,37.7,36.4,35.1,33.9,32.6,31.7,30.8,30.4,29.9]),
('MOCK-WITNESS', 'YAMAHA', 'U3',
 ARRAY[53.5,51.8,50.2,48.6,47.0,45.4,43.8,42.2,40.6,39.2,37.8,36.7,35.6,35.1,34.6],
 ARRAY[41.0,39.6,38.3,37.0,35.7,34.4,33.1,31.9,30.7,29.6,28.5,27.7,26.9,26.5,26.1],
 ARRAY[6.3,6.1,6.0,5.8,5.7,5.5,5.4,5.2,5.0,4.8,4.7,4.5,4.4,4.3,4.3],
 ARRAY[47.3,45.7,44.3,42.8,41.4,39.9,38.5,37.1,35.7,34.4,33.2,32.2,31.3,30.8,30.4]);
