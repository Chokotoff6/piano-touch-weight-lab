export type { PianoType } from "@/data/pianoModels";
export {
  BRAND_MODELS_BY_TYPE,
  BRAND_MODELS_SUGGESTIONS,
  BRAND_SUGGESTIONS,
  modelsFor,
  modelGroupsFor,
  inferTypeFromModel,
} from "@/data/pianoModels";



export const SUGGESTED_COUNTRIES = [
  "ALBANIE",
  "ALGÉRIE",
  "ALLEMAGNE",
  "ARGENTINE",
  "AUSTRALIE",
  "AUTRICHE",
  "BELGIQUE",
  "BIÉLORUSSIE",
  "BOSNIE-HERZÉGOVINE",
  "BRÉSIL",
  "BULGARIE",
  "CANADA",
  "CHINE",
  "CHYPRE",
  "CROATIE",
  "DANEMARK",
  "ESPAGNE",
  "ESTONIE",
  "ÉTATS-UNIS",
  "FINLANDE",
  "FRANCE",
  "GRÈCE",
  "HONGRIE",
  "INDE",
  "IRLANDE",
  "ISLANDE",
  "ITALIE",
  "KAZAKHSTAN",
  "LETTONIE",
  "LITUANIE",
  "LUXEMBOURG",
  "MALTE",
  "MOLDAVIE",
  "MONACO",
  "MONTÉNÉGRO",
  "NORVÈGE",
  "PAYS-BAS",
  "POLOGNE",
  "PORTUGAL",
  "RÉPUBLIQUE TCHÈQUE",
  "ROUMANIE",
  "ROYAUME-UNI",
  "RUSSIE",
  "SERBIE",
  "SLOVAQUIE",
  "SLOVÉNIE",
  "SUÈDE",
  "SUISSE",
  "UKRAINE",
];

export const FREQUENT_COUNTRIES = [
  "FRANCE",
  "BELGIQUE",
  "SUISSE",
  "CANADA",
  "LUXEMBOURG",
  "ÉTATS-UNIS",
];

export type ClimateZone = 1 | 2 | 3 | 4 | 5;

export const COUNTRY_CLIMATE_FALLBACKS: Record<string, ClimateZone> = {
  ALBANIE: 3,
  ALGÉRIE: 5,
  ALLEMAGNE: 2,
  ARGENTINE: 4,
  AUSTRALIE: 3,
  AUTRICHE: 2,
  BELGIQUE: 1,
  BIÉLORUSSIE: 2,
  "BOSNIE-HERZÉGOVINE": 2,
  BRÉSIL: 4,
  BULGARIE: 2,
  CANADA: 2,
  CHINE: 2,
  CHYPRE: 3,
  CROATIE: 3,
  DANEMARK: 1,
  ESPAGNE: 3,
  ESTONIE: 2,
  "ÉTATS-UNIS": 2,
  FINLANDE: 2,
  FRANCE: 1,
  GRÈCE: 3,
  HONGRIE: 2,
  INDE: 4,
  IRLANDE: 1,
  ISLANDE: 1,
  ITALIE: 3,
  KAZAKHSTAN: 2,
  LETTONIE: 2,
  LITUANIE: 2,
  LUXEMBOURG: 1,
  MALTE: 3,
  MOLDAVIE: 2,
  MONACO: 3,
  MONTÉNÉGRO: 3,
  NORVÈGE: 1,
  "PAYS-BAS": 1,
  POLOGNE: 2,
  PORTUGAL: 3,
  "RÉPUBLIQUE TCHÈQUE": 2,
  ROUMANIE: 2,
  "ROYAUME-UNI": 1,
  RUSSIE: 2,
  SERBIE: 2,
  SLOVAQUIE: 2,
  SLOVÉNIE: 2,
  SUÈDE: 1,
  SUISSE: 1,
  UKRAINE: 2,
};

export const DEFAULT_CLIMATE_ZONE: ClimateZone = 1;

/** Normalise une saisie libre : trim, espaces réduits, MAJUSCULES. */
export function normalizeEntry(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

/** Recherche floue simple : sous-séquence insensible à la casse/accents. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function fuzzyMatch(option: string, query: string): boolean {
  const o = fold(option);
  const q = fold(query);
  if (!q) return true;
  if (o.includes(q)) return true;
  let i = 0;
  for (const ch of o) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
}

export function fuzzyFilter(options: string[], query: string): string[] {
  return options.filter((o) => fuzzyMatch(o, query));
}

/** Fait correspondre une saisie à une suggestion (insensible à la casse), sinon MAJUSCULES libres. */
export function resolveEntry(value: string, options: string[]): string {
  const normalized = normalizeEntry(value);
  if (!normalized) return "";
  const exact = options.find((o) => fold(o) === fold(normalized));
  if (exact) return exact;
  const matches = fuzzyFilter(options, normalized);
  if (matches.length === 1) return matches[0]!;
  return normalized;
}
