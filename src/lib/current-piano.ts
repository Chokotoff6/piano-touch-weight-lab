// Entité globale "current_piano" : source de vérité locale du piano mesuré.
// Elle est écrite à la sauvegarde (page Saisie) et lue en priorité par /comparer.
import { externalSupabase } from "@/integrations/external-supabase/client";

export const CURRENT_PIANO_KEY = "current_piano";

export type CurrentPiano = {
  brand: string;
  model: string;
  serial_number: string;
  type_piano: string;
  mesure_date: string; // YYYY-MM-DD
  manufacture_year: number | null;
  climate_zone: string;
  maintenance_type: string;
  usage_level: string;
  ville: string;
  pays: string;
  remarques: string;
  wa_values: number[];
  wd_values: number[];
  friction_values: number[];
  balance_values: number[];
};

const num = (value: string | number | null | undefined) => {
  const raw = typeof value === "number" ? value : String(value ?? "").trim().replace(",", ".");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const round1 = (value: number) => Number(value.toFixed(1));

/** Construit l'objet current_piano à partir des mesures brutes (88 lignes Wa/Wd). */
export function buildCurrentPiano(input: {
  brand: string;
  model: string;
  serial_number: string;
  type_piano: string;
  manufacture_year: number | null;
  climate_zone: string;
  maintenance_type: string;
  usage_level: string;
  ville: string;
  pays: string;
  remarques: string;
  wa: Array<string | number>;
  wd: Array<string | number>;
  mesureDate?: Date;
}): CurrentPiano {
  const wa = input.wa.map(num);
  const wd = input.wd.map(num);
  const friction = wa.map((value, index) => {
    const down = wd[index];
    return typeof down === "number" && Number.isFinite(value) && Number.isFinite(down)
      ? round1(Math.abs((value - down) / 2))
      : Number.NaN;
  });
  const balance = wa.map((value, index) => {
    const down = wd[index];
    return typeof down === "number" && Number.isFinite(value) && Number.isFinite(down)
      ? round1((value + down) / 2)
      : Number.NaN;
  });
  const date = input.mesureDate ?? new Date();
  return {
    brand: input.brand,
    model: input.model,
    serial_number: input.serial_number,
    type_piano: input.type_piano,
    mesure_date: date.toISOString().slice(0, 10),
    manufacture_year: input.manufacture_year,
    climate_zone: input.climate_zone,
    maintenance_type: input.maintenance_type,
    usage_level: input.usage_level,
    ville: input.ville,
    pays: input.pays,
    remarques: input.remarques,
    wa_values: wa,
    wd_values: wd,
    friction_values: friction,
    balance_values: balance,
  };
}

export function saveCurrentPiano(piano: CurrentPiano) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CURRENT_PIANO_KEY, JSON.stringify(piano));
  } catch {
    /* stockage indisponible : la navigation reste possible */
  }
}

export function loadCurrentPiano(): CurrentPiano | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CURRENT_PIANO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CurrentPiano;
    return Array.isArray(parsed?.wa_values) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Envoi cloud vers la table 'piano_profiles' (colonnes réelles de la base).
 * Les 88 notes partent en chaînes JSON textuelles de tableaux.
 * Ne lève jamais : renvoie { ok, error } pour ne pas bloquer la navigation.
 */
export async function saveCurrentPianoToCloud(
  piano: CurrentPiano,
): Promise<{ ok: boolean; error?: string }> {
  const payload = {
    brand: piano.brand,
    model: piano.model,
    serial_number: piano.serial_number,
    type_piano: piano.type_piano,
    mesure_date: piano.mesure_date,
    manufacture_year: piano.manufacture_year,
    climate_zone: piano.climate_zone,
    maintenance_type: piano.maintenance_type,
    usage_level: piano.usage_level,
    ville: piano.ville,
    pays: piano.pays,
    remarques: piano.remarques,
    wa_values: JSON.stringify(piano.wa_values),
    wd_values: JSON.stringify(piano.wd_values),
    friction_values: JSON.stringify(piano.friction_values),
    balance_values: JSON.stringify(piano.balance_values),
  };
  try {
    const { error } = await externalSupabase.from("piano_profiles").insert(payload as never);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur réseau" };
  }
}
