export const BRAND_MODELS_SUGGESTIONS: Record<string, string[]> = {
  YAMAHA: ["U1", "U3", "B1", "B2", "B3", "C3", "C1X", "C3X"],
  KAWAI: ["K-300", "K-500", "K-800", "ND-21", "GL-10", "GX-2", "GX-3", "CA-99"],
  "STEINWAY & SONS": ["K-132", "V-125", "S-155", "M-170", "O-180", "A-188", "B-211", "D-274"],
  "C. BECHSTEIN": ["A 124", "B 116", "Concert 8", "Academy A 160", "B 208", "C 234", "D 282"],
  PLEYEL: ["P 118", "P 124", "P 131", "P 170", "P 190", "P 280"],
  BÖSENDORFER: ["120 CL", "130 CL", "155", "170", "185", "200", "214 VC", "280 VC", "290 Imperial"],
  FAZIOLI: ["F156", "F183", "F212", "F228", "F278", "F308"],
  BLÜTHNER: ["Model A", "Model B", "Model 1", "Model 2", "Model 4", "Model 6", "Model 11"],
  SCHIMMEL: ["C 116", "C 121", "K 122", "K 132", "C 169", "K 189", "K 213", "K 230"],
  PETROF: ["P 118 P1", "P 122 N2", "P 125 F1", "P 131 M1", "P 159 Bora", "P 173 Breeze", "P 210 Pasat"],
  SAUTER: ["Ragazza 112", "Vista 116", "Cometa 122", "Peter Maly 130", "Alpha 160", "Delta 185", "Omega 220"],
  BOSTON: ["UP-118S", "UP-126S", "UP-132S", "GP-156", "GP-163", "GP-178", "GP-193", "GP-215"],
  ESSEX: ["EUP-108", "EUP-116", "EUP-123", "EGP-155", "EGP-161", "EGP-173"],
  SAMICK: ["JS-042", "JS-115", "JS-121", "SU-118", "SG-150", "SIG-50", "NSG-158"],
  "YOUNG CHANG": ["Y-116", "Y-118", "Y-121", "Y-131", "Y-150", "Y-157", "Y-175", "Y-185"],
  FEURICH: ["115 Premiere", "122 Universal", "123 Vienna", "133 Concert", "162 Dynamic", "179 Dynamic", "218 Concert"],
  "PEARL RIVER": ["UP-108", "UP-115", "UP-118", "UP-125", "EU-122", "GP-148", "GP-159", "GP-170"],
};

export const BRAND_SUGGESTIONS = Object.keys(BRAND_MODELS_SUGGESTIONS);

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
