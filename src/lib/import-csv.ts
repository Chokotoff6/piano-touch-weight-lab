export type ImportedDiagnostic = {
  /** Métadonnées brutes telles qu'écrites dans le fichier. */
  meta: Record<string, string>;
  /** Métadonnées normalisées sur les colonnes de la base (brand, model, ...). */
  fields: Record<string, string>;
  /** Toujours 88 emplacements, indexés directement par touche 1 à 88. */
  rows: { wa: string; wd: string }[];
  /** Friction lue dans le fichier (valeur absolue), NaN si absente. */
  friction: number[];
};


const unquote = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
};

const parseLine = (line: string) => {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ";" && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value);
  return values.map(unquote);
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/** Retire les suffixes entre parenthèses : "Wa (g)" -> "wa". */
const headerKey = (value: string) => normalize(value.replace(/\(.*?\)/g, ""));

const startsWithAny = (value: string, prefixes: string[]) =>
  prefixes.some((prefix) => value.startsWith(prefix));

const findColumn = (headers: string[], prefixes: string[]) =>
  headers.findIndex((header) => startsWithAny(header, prefixes));

const INDEX_PREFIXES = ["touche", "note"];
const WA_PREFIXES = ["wa", "poids descendant"];
const WD_PREFIXES = ["wd", "poids ascendant"];
const FRICTION_PREFIXES = ["friction"];

type Columns = { index: number; wa: number; wd: number; friction: number };

function detectColumns(values: string[]): Columns | null {
  const headers = values.map(headerKey);
  const index = findColumn(headers, INDEX_PREFIXES);
  const wa = findColumn(headers, WA_PREFIXES);
  const wd = findColumn(headers, WD_PREFIXES);
  if (index === -1 || wa === -1 || wd === -1) return null;
  return { index, wa, wd, friction: findColumn(headers, FRICTION_PREFIXES) };
}

/**
 * Lecture d'un fichier CSV importé : UTF-8 strict d'abord, sinon Windows-1252
 * (fichiers réenregistrés par Excel, où « Modèle » devient « Mod?le »).
 */
export async function readCsvFileContent(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

/** Clés exactes de l'export officiel (FR avec accents stricts + EN), lues en priorité. */
const EXACT_META_KEYS: Record<string, string> = {
  Marque: "brand",
  Brand: "brand",
  Modèle: "model",
  Model: "model",
  "Numéro de série": "serial_number",
  "Serial number": "serial_number",
};

/** Clés canoniques des métadonnées, repérées par mots-clés. */
const META_ALIASES: { key: string; match: string[] }[] = [
  { key: "brand", match: ["marque", "brand"] },
  { key: "model", match: ["modele", "model"] },
  { key: "serial_number", match: ["numero de serie", "serial"] },
  { key: "serial_prefix", match: ["prefixe lettre", "prefixe"] },
  { key: "serial_suffix", match: ["suffixe lettre", "suffixe"] },
  { key: "manufacture_year", match: ["date de fabrication", "annee de fabrication", "manufacture"] },
  { key: "maintenance_type", match: ["type d'entretien", "type dentretien", "maintenance"] },
  { key: "usage_level", match: ["usage_level", "niveau d'usage", "niveau dusage", "usage"] },
  { key: "type_piano", match: ["type de piano"] },
  { key: "climate_zone", match: ["zone climatique", "climate"] },
  { key: "ville", match: ["ville", "city"] },
  { key: "pays", match: ["pays", "country"] },
  { key: "remarques", match: ["remarque"] },
  { key: "mesure_date", match: ["date et heure de saisie", "date de mesure"] },
];

function canonicalMetaKey(label: string): string | null {
  // Priorité absolue aux clés exactes de l'export officiel (accents stricts).
  const exact = EXACT_META_KEYS[label.trim()];
  if (exact) return exact;
  const normalized = normalize(label);
  for (const alias of META_ALIASES) {
    if (alias.match.some((needle) => normalized.startsWith(needle))) return alias.key;
  }
  return null;
}

const toNumber = (value: string | undefined) => {
  const raw = (value ?? "").trim().replace(",", ".");
  if (raw === "") return Number.NaN;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export function parseDiagnosticCsv(content: string): ImportedDiagnostic {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  const meta: Record<string, string> = {};
  const fields: Record<string, string> = {};
  let headerIndex = -1;
  let columns: Columns | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    // Ligne de signature / commentaire technique : ignorée par le parseur.
    if ((lines[index] ?? "").trimStart().startsWith("#")) continue;
    const values = parseLine(lines[index] ?? "");
    if (!columns && values.length >= 3) {
      const detected = detectColumns(values);
      if (detected) {
        headerIndex = index;
        columns = detected;
        continue;
      }
    }
    if (headerIndex === -1 && values[0]?.trim() && values.length >= 2) {
      const label = values[0].trim();
      const value = values.slice(1).join(";").trim();
      meta[label] = value;
      const canonical = canonicalMetaKey(label);
      if (canonical && value) fields[canonical] = value;
    }
  }

  if (headerIndex === -1 || !columns) throw new Error("INVALID_CSV");

  // Pas de filtrage par couleur de touche : les 88 lignes sont toutes importées.
  const rows = Array.from({ length: 88 }, () => ({ wa: "", wd: "" }));
  const friction = Array.from({ length: 88 }, () => Number.NaN);
  let count = 0;
  for (const rawLine of lines.slice(headerIndex + 1)) {
    const values = parseLine(rawLine);
    if (values.length <= Math.max(columns.index, columns.wa, columns.wd)) continue;
    const key = Number((values[columns.index] ?? "").trim());
    if (!Number.isInteger(key) || key < 1 || key > 88) continue;
    rows[key - 1] = { wa: (values[columns.wa] ?? "").trim(), wd: (values[columns.wd] ?? "").trim() };
    if (columns.friction !== -1) {
      const value = toNumber(values[columns.friction]);
      friction[key - 1] = Number.isFinite(value) ? Math.abs(value) : Number.NaN;
    }
    count += 1;
  }

  if (count === 0) throw new Error("INVALID_CSV");

  // Numéro de série complet : préfixe + numéro central + suffixe (sans espace parasite).
  const full = `${fields["serial_prefix"] ?? ""}${fields["serial_number"] ?? ""}${fields["serial_suffix"] ?? ""}`.trim();
  if (full) fields["serial_number"] = full;
  else delete fields["serial_number"];

  return { meta, fields, rows, friction };
}

