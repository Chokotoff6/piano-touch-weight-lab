// Client Supabase EXTERNE (projet de production de l'utilisateur).
// Source de vérité pour les profils de comparaison lus par /comparer.
// Lovable Cloud reste le backend interne de l'app ; ce client ne sert qu'à
// lire les données hébergées sur le projet externe djnznvmdzyvlekqypaox.
import { createClient } from "@supabase/supabase-js";

const EXTERNAL_SUPABASE_URL = "https://djnznvmdzyvlekqypaox.supabase.co";
// Clé publishable (anon) : publique par design, l'accès est restreint par les
// règles RLS du projet externe.
const EXTERNAL_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_7FJI7BOIT-UiLwH6z0ePvw_220oBN4C";

// Les clés sb_publishable_ sont opaques (pas des JWT) : on supprime l'en-tête
// Authorization: Bearer <clé> et on n'envoie que l'en-tête apikey.
function externalFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(
    typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
  );
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }
  if (headers.get("Authorization") === `Bearer ${EXTERNAL_SUPABASE_PUBLISHABLE_KEY}`) {
    headers.delete("Authorization");
  }
  headers.set("apikey", EXTERNAL_SUPABASE_PUBLISHABLE_KEY);
  return fetch(input, { ...init, headers });
}

export type ExternalPianoProfileRow = {
  id: string;
  serial_number: string;
  brand?: string | null;
  model?: string | null;
  wa_values: number[];
  wd_values: number[];
  friction_values: number[];
  balance_values: number[];
  remarques: string | null;
  annee_fabrication: number | null;
  manufacture_year?: number | null;
  mesure_date?: string | null;
  zone_climatique?: string | null;
  type_entretien?: string | null;
  climate_zone?: string | null;
  maintenance_type?: string | null;
  usage_level?: string | null;
  created_at: string;
};


export const externalSupabase = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_PUBLISHABLE_KEY,
  {
    global: { fetch: externalFetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);
