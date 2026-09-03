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
  /** Horodatage complet (ISO ou litéral DB) servant à afficher l'heure de saisie. */
  created_at?: string | undefined;
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

/**
 * Extrait date (YYYY-MM-DD) et heure (hh:mm) d'un littéral de date/heure.
 * Accepte : YYYY-MM-DD, YYYY-MM-DDTHH:mm(:ss)Z, YYYY-MM-DD HH:mm,
 * DD-MM-YYYY, DD-MM-YYYY HH:mm.
 */
export function parseMeasureDateTime(raw: string | null | undefined): { date: string; time: string | null } {
  const s = (raw ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: m[4] ? `${m[4]}:${m[5]}` : null };
  m = s.match(/^(\d{2})-(\d{2})-(\d{4})(?: (\d{2}):(\d{2}))?/);
  if (m) return { date: `${m[3]}-${m[2]}-${m[1]}`, time: m[4] ? `${m[4]}:${m[5]}` : null };
  return { date: s, time: null };
}

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
  /** Littéral date/heure du fichier source (CSV) : sert à dater et horodater. */
  mesureDateRaw?: string | undefined;
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
  let mesure_date = date.toISOString().slice(0, 10);
  let created_at: string | undefined;
  if (input.mesureDateRaw) {
    const parsed = parseMeasureDateTime(input.mesureDateRaw);
    if (parsed.date) mesure_date = parsed.date;
    if (parsed.time) created_at = `${parsed.date}T${parsed.time}`;
  }
  return {
    brand: input.brand,
    model: input.model,
    serial_number: input.serial_number,
    type_piano: input.type_piano,
    mesure_date,
    created_at,
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

/** Conversion d'un tableau JS vers un littéral de tableau PostgreSQL : {1,2,3}. */
export function toPgArray(values: Array<number | null | undefined>): string {
  const cells = values.map((value) =>
    typeof value === "number" && Number.isFinite(value) ? String(value) : "NULL",
  );
  return `{${cells.join(",")}}`;
}

/** Décodage d'un littéral PostgreSQL {1,2,3} (ou d'un tableau déjà parsé). */
export function fromPgArray(value: unknown): number[] {
  if (Array.isArray(value)) return value.map((cell) => Number(cell));
  if (typeof value !== "string") return [];
  const body = value.trim().replace(/^[{[]/, "").replace(/[}\]]$/, "");
  if (!body) return [];
  return body.split(",").map((cell) => {
    const clean = cell.trim().replace(/^"|"$/g, "");
    return clean === "" || clean.toUpperCase() === "NULL" ? Number.NaN : Number(clean);
  });
}

/**
 * Envoi cloud vers la table 'piano_profiles' (colonnes réelles de la base).
 * Les 88 notes partent en littéraux de tableaux PostgreSQL ({...}).
 * Ne lève jamais : renvoie { ok, error } pour ne pas bloquer la navigation.
 */
export async function saveCurrentPianoToCloud(
  piano: CurrentPiano,
  historyId?: string | null,
): Promise<{ ok: boolean; error?: string; id?: string | undefined }> {
  const payload = {
    brand: piano.brand,
    model: piano.model,
    serial_number: piano.serial_number,
    is_buffer: false,
    type_piano: piano.type_piano,
    mesure_date: piano.mesure_date,
    manufacture_year: piano.manufacture_year,
    climate_zone: piano.climate_zone,
    maintenance_type: piano.maintenance_type,
    usage_level: piano.usage_level,
    ville: piano.ville,
    pays: piano.pays,
    remarques: piano.remarques,
    wa_values: toPgArray(piano.wa_values),
    wd_values: toPgArray(piano.wd_values),
    friction_values: toPgArray(piano.friction_values),
    balance_values: toPgArray(piano.balance_values),
  };
  try {
    // UPDATE de la fiche historique existante (son propre ID, is_buffer=false)...
    if (historyId) {
      const { error } = await externalSupabase
        .from("piano_profiles")
        .update(payload as never)
        .eq("id", historyId);
      return error ? { ok: false, error: error.message } : { ok: true, id: historyId };
    }
    // ...sinon INSERT d'une nouvelle fiche historique indépendante du buffer.
    const { data, error } = await externalSupabase
      .from("piano_profiles")
      .insert(payload as never)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data ? String((data as { id?: unknown }).id ?? "") : undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur réseau" };
  }
}

/** Recherche l'ID de la fiche historique (is_buffer=false) d'un numéro de série. */
export async function findHistoryProfileId(serialNumber: string): Promise<string | null> {
  try {
    const { data, error } = await externalSupabase
      .from("piano_profiles")
      .select("id")
      .eq("serial_number", serialNumber)
      .eq("is_buffer", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return String((data as { id?: unknown }).id ?? "") || null;
  } catch {
    return null;
  }
}

/** Ancien numéro de série pivot (héritage : remplacé par la colonne booléenne is_buffer). */
export const CURRENT_PIANO_BUFFER_ID = "PIANO_ACTUEL";

/** UUID fixe de la ligne tampon unique (buffer cloud du piano en cours). */
export const CURRENT_PIANO_BUFFER_UUID = "00000000-0000-0000-0000-000000000000";

/** Colonnes de la ligne tampon (métadonnées + 4 tableaux au format PostgreSQL {...}). */
function bufferPayload(piano: CurrentPiano) {
  return {
    brand: piano.brand,
    model: piano.model,
    // Le VRAI numéro de série est stocké ; le marqueur de tampon est is_buffer.
    serial_number: piano.serial_number,
    is_buffer: true,
    type_piano: piano.type_piano,
    mesure_date: piano.mesure_date,
    manufacture_year: piano.manufacture_year,
    climate_zone: piano.climate_zone,
    maintenance_type: piano.maintenance_type,
    usage_level: piano.usage_level,
    ville: piano.ville,
    pays: piano.pays,
    remarques: piano.remarques,
    wa_values: toPgArray(piano.wa_values),
    wd_values: toPgArray(piano.wd_values),
    friction_values: toPgArray(piano.friction_values),
    balance_values: toPgArray(piano.balance_values),
  };
}

/**
 * UPSERT systématique de l'état écran dans la ligne unique où is_buffer = true.
 * C'est cette ligne que /comparer lit en priorité absolue (courbe Live noire).
 * Stratégie sans contrainte d'unicité : UPDATE si la ligne tampon existe,
 * sinon INSERT.
 */
export async function upsertCurrentPianoBuffer(
  piano: CurrentPiano,
): Promise<{ ok: boolean; error?: string }> {
  // Épinglage sur l'UUID fixe : 1 seul .upsert(), pas de recherche préalable fragile.
  const payload = { id: CURRENT_PIANO_BUFFER_UUID, ...bufferPayload(piano) };
  try {
    const { error } = await externalSupabase
      .from("piano_profiles")
      .upsert(payload as never);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur réseau" };
  }
}

/** Lecture de la ligne tampon (is_buffer = true) : priorité absolue sur /comparer. */
export async function loadCurrentPianoFromCloud(): Promise<CurrentPiano | null> {
  try {
    const { data, error } = await externalSupabase
      .from("piano_profiles")
      .select("*")
      .eq("is_buffer", true)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as Record<string, unknown>;
    const wa = fromPgArray(row["wa_values"]);
    if (wa.length === 0) return null;
    return {
      brand: String(row["brand"] ?? ""),
      model: String(row["model"] ?? ""),
      serial_number: String(row["serial_number"] ?? ""),
      type_piano: String(row["type_piano"] ?? ""),
      mesure_date: String(row["mesure_date"] ?? new Date().toISOString().slice(0, 10)),
      created_at: row["created_at"] ? String(row["created_at"]) : undefined,
      manufacture_year:
        row["manufacture_year"] === null || row["manufacture_year"] === undefined
          ? null
          : Number(row["manufacture_year"]),
      climate_zone: String(row["climate_zone"] ?? ""),
      maintenance_type: String(row["maintenance_type"] ?? ""),
      usage_level: String(row["usage_level"] ?? ""),
      ville: String(row["ville"] ?? ""),
      pays: String(row["pays"] ?? ""),
      remarques: String(row["remarques"] ?? ""),
      wa_values: wa,
      wd_values: fromPgArray(row["wd_values"]),
      friction_values: fromPgArray(row["friction_values"]),
      balance_values: fromPgArray(row["balance_values"]),
    };
  } catch {
    return null;
  }
}

