export type PianoType = "Droit" | "à Queue";

const BASE_BRAND_MODELS_BY_TYPE: Record<string, { droit: string[]; queue: string[] }> = {
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
  PLEYEL: {
    droit: ["P116", "P124", "P131", "Marigny", "Vendôme"],
    queue: ["Modèle 3", "Modèle F", "Modèle P", "Modèle 1"],
  },
  SCHIMMEL: {
    droit: ["C116", "C120", "C121", "C126", "C130", "K122", "K125", "K132", "112", "114", "116"],
    queue: ["K169", "K175", "K195", "K213", "K230", "K256", "K280"],
  },
  PETROF: {
    droit: ["P118", "P122", "P125", "P131", "P135"],
    queue: [
      "Bora", "Puccini", "P159 Bora", "P173 Breeze", "P194 Storm",
      "P210 Pasat", "P237 Monsoon", "P284 Mistral",
    ],
  },
  BLÜTHNER: {
    droit: ["Modèle A", "Modèle B", "Modèle C", "Modèle S"],
    queue: ["Modèle 1", "Modèle 2", "Modèle 4", "Modèle 6", "Modèle 10", "Modèle 11"],
  },
  FAZIOLI: {
    droit: [],
    queue: ["F156", "F183", "F212", "F228", "F278", "F308"],
  },
  SAUTER: {
    droit: [
      "Nova 116", "Vision 116", "Cura 122", "Master Class 122", "Master Class 130", "Concent 130",
    ],
    queue: ["Alpha 160", "Delta 185", "Omega 220", "Concert 275"],
  },
  "GROTRIAN-STEINWEG": {
    droit: ["G-114", "G-118", "G-124", "Classic 124", "Concertino 132"],
    queue: ["Cabinet 192", "Charis 208", "Concert 225", "Concert 277"],
  },
  "STEINGRAEBER & SÖHNE": {
    droit: ["122", "130", "138"],
    queue: ["A-170", "B-192", "C-212", "D-232", "E-272"],
  },
  FEURICH: {
    droit: ["115 Premiere", "122 Universal", "125 Design", "133 Concert"],
    queue: ["162 Dynamic I", "179 Dynamic II", "218 Concert"],
  },
  SEILER: {
    droit: ["116 Primus", "122 Ritmo", "132 Konzert", "Eduard 126"],
    queue: ["168 Virtuoso", "186 Maestro", "208 Professional", "242 Konzert"],
  },
  "W. HOFFMANN": {
    droit: ["V112", "V120", "T122", "T128", "P120", "P126"],
    queue: ["V158", "V177", "T161", "T177", "T186", "P161", "P188", "P206"],
  },
  ZIMMERMANN: {
    droit: ["HZ120", "HZ126", "Studio S2", "Studio S6"],
    queue: ["HZ160", "HZ175", "Studio S160", "Studio S175"],
  },
  BOSTON: {
    droit: ["UP-118", "UP-126", "UP-132"],
    queue: ["GP-156", "GP-163", "GP-178", "GP-193", "GP-215"],
  },
  ESSEX: {
    droit: ["EUP-111", "EUP-116", "EUP-123"],
    queue: ["EGP-155", "EGP-173"],
  },
  SAMICK: {
    droit: ["JS-115", "JS-121", "JS-131"],
    queue: ["SIG-50", "SIG-54", "SIG-57", "NSG-175", "NSG-186"],
  },
};

/** Catalogue standard (hauteurs / longueurs) pour les marques sans catalogue détaillé. */
const STANDARD_CATALOG = {
  droit: ["110", "112", "115", "116", "118", "121", "122", "125", "126", "131", "SU-118", "SU-121JS"],
  queue: ["150", "151", "161", "172", "175", "178", "185", "186", "208", "218", "NS-150", "SIG-50"],
};

/** Ajouts exhaustifs : modèles historiques, d'occasion et contemporains. */
const MODEL_ADDITIONS: Record<string, { droit: string[]; queue: string[] }> = {
  YAMAHA: {
    droit: ["b1", "b2", "b3", "U1", "U2", "U3", "YUS1", "YUS3", "YUS5", "P116", "P121", "SE122", "SE132", "SU118", "SU7", "UX", "U10BL", "U30BL", "YU1", "YU3", "YU5"],
    queue: ["GB1K", "GC1", "GC2", "CX1", "CX2", "CX3", "CX5", "CX6", "CX7", "C1", "C2", "C3", "C5", "C7", "G1", "G2", "G3", "G5", "S3X", "S5X", "S6X", "S7X", "CF4", "CF6", "CFX"],
  },
  KAWAI: {
    droit: ["K-15E", "K-200", "K-300", "K-500", "K-600", "K-800", "K-2", "K-3", "K-5", "K-6", "K-8", "KX-21", "BS-20", "NS-20", "UST-9"],
    queue: ["GL-10", "GL-30", "GL-40", "GL-50", "GX-1", "GX-2", "GX-3", "GX-5", "GX-6", "GX-7", "RX-1", "RX-2", "RX-3", "RX-5", "RX-6", "RX-7", "GE-20", "GE-30", "SK-2", "SK-3", "SK-5", "SK-6", "SK-7", "SK-EX"],
  },
  "STEINWAY & SONS": {
    droit: ["V-125", "K-132"],
    queue: ["S-155", "M-170", "O-180", "A-188", "B-211", "C-227", "D-274"],
  },
  SCHIMMEL: {
    droit: ["112", "116", "120", "122", "124", "130", "C116", "C121", "C126", "K122", "K125", "K132", "W114", "W118", "W123"],
    queue: ["174", "182", "205", "C169", "C189", "C213", "W180", "W206", "K175", "K195", "K219", "K230", "K256", "K280"],
  },
  "C. BECHSTEIN": {
    droit: ["Modèle 8", "Modèle 9", "Modèle 10", "Concert 8", "112", "116", "124", "A114", "A124", "Millennium 116", "Academy 124"],
    queue: ["Modèle A", "Modèle B", "Modèle C", "Modèle D", "Modèle E", "Modèle V", "L167", "M116", "A160", "A175", "A190", "A208", "A228", "C234", "D282"],
  },
  "W. HOFFMANN": {
    droit: ["V120", "T122", "P126", "112", "116", "124"],
    queue: ["V158", "T177", "P188"],
  },
  PLEYEL: {
    droit: ["Modèle P", "Modèle 9", "Marigny", "P124", "P130", "P131"],
    queue: ["Modèle 3", "Modèle 3 Bis", "Modèle F", "P170", "P190", "P204"],
  },
  "GROTRIAN-STEINWEG": {
    droit: ["110", "112", "113", "114", "120", "122", "124", "Classic 124", "Concert 132"],
    queue: ["160", "165", "185", "192", "200", "208", "223", "225", "275", "G-165", "G-192", "G-208", "G-225", "G-277"],
  },
  BÖSENDORFER: {
    droit: ["120CL", "130CL"],
    queue: ["155", "170", "175", "185", "200", "214", "214VC", "225", "230VC", "275", "280VC", "290 Imperial"],
  },
  SAUTER: {
    droit: ["112", "116", "122", "130", "Nova 116", "Vista 122", "Master Class 122", "Master Class 130"],
    queue: ["160", "185", "220", "Alpha 160", "Delta 185", "Omega 220", "Concert 275"],
  },
  BLÜTHNER: {
    droit: ["Modèle A", "Modèle B", "Modèle C", "Modèle D", "118", "124", "132"],
    queue: ["Modèle 1", "Modèle 2", "Modèle 4", "Modèle 6", "Modèle 10", "Modèle 11", "166", "190", "210", "238", "280"],
  },
  PETROF: {
    droit: ["P 118", "P 122", "P 125", "P 131", "P 135", "115", "116", "125"],
    queue: ["P 159 Bora", "P 173 Regia", "P 194 Storm", "P 210 Pasat", "P 237 Monsoon", "P 284 Mistral", "Modèle III", "Modèle IV"],
  },
  SEILER: {
    droit: ["116", "122", "126", "132", "Primus 116", "Eduard 122", "Konsole 122"],
    queue: ["168", "186", "208", "242", "278", "Baron 186", "Maestro 208"],
  },
  BALDWIN: {
    droit: ["Acorn", "Hamilton", "Studio 243", "121", "Console"],
    queue: ["M", "R", "L", "SF-10", "SD-10", "165", "185"],
  },
  WURLITZER: {
    droit: ["Acorn", "Hamilton", "Studio 243", "121", "Console"],
    queue: ["M", "R", "L", "SF-10", "SD-10", "165", "185"],
  },
  SAMICK: { ...STANDARD_CATALOG },
  "YOUNG CHANG": { ...STANDARD_CATALOG },
  "PEARL RIVER": { ...STANDARD_CATALOG },
  HAILUN: { ...STANDARD_CATALOG },
  FEURICH: { ...STANDARD_CATALOG },
  RITMÜLLER: { ...STANDARD_CATALOG },
};

function mergeUnique(a: string[] = [], b: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of [...a, ...b]) {
    const k = v.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

export const BRAND_MODELS_BY_TYPE: Record<string, { droit: string[]; queue: string[] }> = (() => {
  const out: Record<string, { droit: string[]; queue: string[] }> = {};
  const brands = new Set([...Object.keys(BASE_BRAND_MODELS_BY_TYPE), ...Object.keys(MODEL_ADDITIONS)]);
  for (const brand of brands) {
    const base = BASE_BRAND_MODELS_BY_TYPE[brand];
    const add = MODEL_ADDITIONS[brand];
    out[brand] = {
      droit: mergeUnique(base?.droit, add?.droit),
      queue: mergeUnique(base?.queue, add?.queue),
    };
  }
  return out;
})();

export const BRAND_MODELS_SUGGESTIONS: Record<string, string[]> = Object.fromEntries(
  Object.entries(BRAND_MODELS_BY_TYPE).map(([brand, m]) => [brand, [...m.droit, ...m.queue]]),
);

/** Normalise le libellé de type (« Droit » / « à Queue », insensible à la casse et aux préfixes). */
function typeKey(type?: string): "droit" | "queue" | null {
  const t = (type ?? "").toLowerCase();
  if (t.includes("queue")) return "queue";
  if (t.includes("droit")) return "droit";
  return null;
}

/** Modèles filtrés par marque et, si connu, par type de piano (exclusion stricte). */
export function modelsFor(brand: string, type?: string): string[] {
  const entry = BRAND_MODELS_BY_TYPE[brand.trim().toUpperCase()];
  if (!entry) return [];
  const t = typeKey(type);
  if (t === "droit") return entry.droit;
  if (t === "queue") return entry.queue;
  return [...entry.droit, ...entry.queue];
}

export function modelGroupsFor(brand: string, type?: string) {
  const entry = BRAND_MODELS_BY_TYPE[brand.trim().toUpperCase()];
  if (!entry) return [];
  const t = typeKey(type);
  if (t === "droit") return [{ label: "Droits", options: entry.droit }];
  if (t === "queue") return [{ label: "De queue", options: entry.queue }];
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
  if (entry.droit.some((m) => normalizeEntry(m) === normalized)) return "Droit";
  if (entry.queue.some((m) => normalizeEntry(m) === normalized)) return "à Queue";
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
