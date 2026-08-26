export type PianoType = "Piano Droit" | "Piano à Queue";

export const BRAND_MODELS_BY_TYPE: Record<string, { droit: string[]; queue: string[] }> = {
  YAMAHA: {
    droit: [
      "U1", "U1A", "U1B", "U1C", "U1H", "U1M", "U1G", "U1E", "U10A", "U10BL", "U100",
      "U3", "U3H", "U3M", "U3A", "U3G", "U30BL", "U300",
      "UX", "UX-1", "UX-3", "UX-5", "UX10BL", "UX30BL",
      "YU1", "YU3", "YU5", "YU11", "YU33",
      "B1", "B2", "B3",
      "P116", "P121", "P124",
      "YUS1", "YUS3", "YUS5",
      "SU118", "SU7",
      "SE122", "SE132",
    ],
    queue: [
      "G1", "G2", "G3", "G5",
      "C1", "C2", "C3", "C5", "C7",
      "C1X", "C2X", "C3X", "C5X", "C6X", "C7X",
      "S4", "S6", "S3X", "S5X", "S7X",
      "CF4", "CF6", "CFX",
    ],
  },
  KAWAI: {
    droit: [
      "K-15", "K-200", "K-300", "K-500", "K-600", "K-800",
      "K-2", "K-3", "K-5", "K-6", "K-8",
      "UST-9",
      "BL-12", "BL-31", "BL-51", "BL-61", "BL-71",
      "KS-1F", "KS-2F", "KS-3F", "KS-5F",
      "NS-10", "NS-15", "NS-25", "NS-35",
      "XO-1", "XO-2", "XO-3", "XO-8",
      "ND-21",
    ],
    queue: [
      "GL-10", "GL-20", "GL-30", "GL-40", "GL-50",
      "GX-1", "GX-2", "GX-3", "GX-5", "GX-6", "GX-7",
      "RX-1", "RX-2", "RX-3", "RX-5", "RX-6", "RX-7",
      "KG-1", "KG-2", "KG-3", "KG-5", "KG-6",
      "KG-1C", "KG-2C", "KG-3C", "KG-5C",
      "KG-2D", "KG-2E",
      "GS-30", "GS-40", "GS-50", "GS-60",
      "GE-1", "GE-20", "GE-30",
      "GM-1", "GM-2", "GM-10", "GM-11", "GM-12",
      "EX",
      "Shigeru Kawai", "SK-2", "SK-3", "SK-5", "SK-6", "SK-7", "SK-EX",
    ],
  },
  "STEINWAY & SONS": {
    droit: ["V-125", "K-132", "Z-114", "F-105", "4510"],
    queue: [
      "S-155", "M-170", "O-180", "L-179",
      "A-188", "A-I", "A-II", "A-III",
      "B-211", "C-227", "D-274",
    ],
  },
  "C. BECHSTEIN": {
    droit: [
      "Academy A1", "A124", "A114",
      "Academy A2", "A120", "A116",
      "Concert 8",
      "Classic 118", "Contur 118", "Elegance 124",
      "Modèle 6", "I",
      "Modèle 7", "II",
      "Modèle 8", "III",
      "Modèle 9", "IV",
      "Modèle 10", "V",
      "Modèle 11",
    ],
    queue: [
      "Academy A160", "Academy A175", "Academy A190", "Academy A208", "Academy A228",
      "Concert L167", "Concert M/P192", "Concert B212", "Concert C234", "Concert D282",
      "Modèle A", "Modèle B", "Modèle C", "Modèle D", "Modèle E",
    ],
  },
  BÖSENDORFER: {
    droit: ["116SP", "120CL", "130CL", "Grand Upright 120", "Grand Upright 130"],
    queue: [
      "155",
      "170", "170VC",
      "185", "185VC",
      "200",
      "214", "214VC",
      "225 (92 touches)",
      "275",
      "280", "280VC",
      "290 Imperial (97 touches)",
    ],
  },
};

export const BRAND_MODELS_SUGGESTIONS: Record<string, string[]> = Object.fromEntries(
  Object.entries(BRAND_MODELS_BY_TYPE).map(([brand, m]) => [brand, [...m.droit, ...m.queue]]),
);

/** Modèles filtrés par marque et, si connu, par type de piano. */
export function modelsFor(brand: string, type?: string): string[] {
  const entry = BRAND_MODELS_BY_TYPE[brand.trim().toUpperCase()];
  if (!entry) return [];
  if (type === "Piano Droit") return entry.droit;
  if (type === "Piano à Queue") return entry.queue;
  return [...entry.droit, ...entry.queue];
}

export function modelGroupsFor(brand: string, type?: string) {
  const entry = BRAND_MODELS_BY_TYPE[brand.trim().toUpperCase()];
  if (!entry) return [];
  if (type === "Piano Droit") return [{ label: "Droits", options: entry.droit }];
  if (type === "Piano à Queue") return [{ label: "De queue", options: entry.queue }];
  return [
    { label: "Droits", options: entry.droit },
    { label: "De queue", options: entry.queue },
  ];
}

/** Déduit le type de piano à partir d'un modèle connu du dictionnaire. */
export function inferTypeFromModel(brand: string, model: string): PianoType | null {
  const entry = BRAND_MODELS_BY_TYPE[brand.trim().toUpperCase()];
  if (!entry || !model.trim()) return null;
  const normalized = normalizeEntry(model);
  if (entry.droit.some((m) => normalizeEntry(m) === normalized)) return "Piano Droit";
  if (entry.queue.some((m) => normalizeEntry(m) === normalized)) return "Piano à Queue";
  return null;
}

export const BRAND_SUGGESTIONS = Object.keys(BRAND_MODELS_BY_TYPE);


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
