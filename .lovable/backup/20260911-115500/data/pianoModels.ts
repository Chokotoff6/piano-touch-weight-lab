export type PianoType = "Droit" | "à Queue";

export type ModelCatalog = { droit: string[]; queue: string[] };

/**
 * Catalogue exhaustif des modèles de piano, structuré par marque puis par type.
 * Ce fichier est la source unique de vérité pour les suggestions du champ "Modèle".
 */
export const PIANO_MODELS_CATALOG: Record<string, ModelCatalog> = {
  YAMAHA: {
    droit: [
      "b1", "b2", "b3",
      "U1", "U2", "U3",
      "YUS1", "YUS3", "YUS5",
      "P116", "P121",
      "SE122", "SE132",
      "SU118", "SU7",
      "UX", "U10BL", "U30BL",
      "YU1", "YU3", "YU5",
    ],
    queue: [
      "GB1K", "GC1", "GC2",
      "CX1", "CX2", "CX3", "CX5", "CX6", "CX7",
      "C1", "C2", "C3", "C5", "C7",
      "G1", "G2", "G3", "G5",
      "S3X", "S5X", "S6X", "S7X",
      "CF4", "CF6", "CFX",
    ],
  },
  KAWAI: {
    droit: [
      "K-15E", "K-200", "K-300", "K-500", "K-600", "K-800",
      "K-2", "K-3", "K-5", "K-6", "K-8",
      "KX-21", "BS-20", "NS-20", "UST-9",
    ],
    queue: [
      "GL-10", "GL-30", "GL-40", "GL-50",
      "GX-1", "GX-2", "GX-3", "GX-5", "GX-6", "GX-7",
      "RX-1", "RX-2", "RX-3", "RX-5", "RX-6", "RX-7",
      "GE-20", "GE-30",
      "SK-2", "SK-3", "SK-5", "SK-6", "SK-7", "SK-EX",
    ],
  },
  "STEINWAY & SONS": {
    droit: ["V-125", "K-132"],
    queue: ["S-155", "M-170", "O-180", "A-188", "B-211", "C-227", "D-274"],
  },
  SCHIMMEL: {
    droit: [
      "112", "116", "120", "122", "124", "130",
      "C116", "C121", "C126",
      "K122", "K125", "K132",
      "W114", "W118", "W123",
    ],
    queue: [
      "174", "182", "205",
      "C169", "C189", "C213",
      "W180", "W206",
      "K175", "K195", "K219", "K230", "K256", "K280",
    ],
  },
  "C. BECHSTEIN & W. HOFFMANN": {
    droit: [
      "Modèle 8", "Modèle 9", "Modèle 10",
      "Concert 8",
      "112", "116", "124",
      "A114", "A124",
      "Millennium 116", "Academy 124",
      "V120", "T122", "P126",
    ],
    queue: [
      "Modèle A", "Modèle B", "Modèle C", "Modèle D", "Modèle E", "Modèle V",
      "L167", "M116",
      "A160", "A175", "A190", "A208", "A228",
      "C234", "D282",
      "V158", "T177", "P188",
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
  "W. HOFFMANN": {
    droit: ["V112", "V120", "T122", "T128", "P120", "P126"],
    queue: ["V158", "V177", "T161", "T177", "T186", "P161", "P188", "P206"],
  },
  PLEYEL: {
    droit: ["Modèle P", "Modèle 9", "Marigny", "P124", "P130", "P131"],
    queue: ["Modèle 3", "Modèle 3 Bis", "Modèle F", "P170", "P190", "P204"],
  },
  "GROTRIAN-STEINWEG": {
    droit: [
      "110", "112", "113", "114", "120", "122", "124",
      "Classic 124", "Concert 132",
    ],
    queue: [
      "160", "165", "185", "192", "200", "208", "223", "225", "275",
      "G-165", "G-192", "G-208", "G-225", "G-277",
    ],
  },
  BÖSENDORFER: {
    droit: ["120CL", "130CL"],
    queue: [
      "155", "170", "175", "185", "200",
      "214", "214VC",
      "225", "230VC",
      "275",
      "280VC",
      "290 Imperial",
    ],
  },
  BLÜTHNER: {
    droit: ["Modèle A", "Modèle B", "Modèle C", "Modèle D", "118", "124", "132"],
    queue: [
      "Modèle 1", "Modèle 2", "Modèle 4", "Modèle 6", "Modèle 10", "Modèle 11",
      "166", "190", "210", "238", "280",
    ],
  },
  PETROF: {
    droit: ["P 118", "P 122", "P 125", "P 131", "P 135", "115", "116", "125"],
    queue: [
      "P 159 Bora", "P 173 Regia", "P 194 Storm",
      "P 210 Pasat", "P 237 Monsoon", "P 284 Mistral",
      "Modèle III", "Modèle IV",
    ],
  },
  SEILER: {
    droit: ["116", "122", "126", "132", "Primus 116", "Eduard 122", "Konsole 122"],
    queue: ["168", "186", "208", "242", "278", "Baron 186", "Maestro 208"],
  },
  SAUTER: {
    droit: [
      "112", "116", "122", "130",
      "Nova 116", "Vista 122",
      "Master Class 122", "Master Class 130",
    ],
    queue: [
      "160", "185", "220",
      "Alpha 160", "Delta 185", "Omega 220",
      "Concert 275",
    ],
  },
  FAZIOLI: {
    droit: [],
    queue: ["F156", "F183", "F212", "F228", "F278", "F308"],
  },
  "STEINGRAEBER & SÖHNE": {
    droit: ["122", "130", "138"],
    queue: ["A-170", "B-192", "C-212", "D-232", "E-272"],
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
  "BALDWIN & WURLITZER": {
    droit: ["Acorn", "Hamilton", "Studio 243", "121", "Console"],
    queue: ["M", "R", "L", "SF-10", "SD-10", "165", "185"],
  },
};

/** Catalogue standardisé attribué dynamiquement aux marques secondaires. */
export const SECONDARY_BRANDS_STANDARD_CATALOG: ModelCatalog = {
  droit: ["110", "112", "115", "116", "118", "121", "122", "125", "126", "131", "Studio", "Console"],
  queue: ["150", "151", "161", "168", "172", "175", "178", "185", "186", "208", "218", "Concert"],
};

/** Marques bénéficiant du catalogue standardisé lorsqu'aucun catalogue spécifique n'existe. */
export const SECONDARY_BRANDS = [
  "SAMICK",
  "YOUNG CHANG",
  "PEARL RIVER",
  "HAILUN",
  "FEURICH",
  "RITMÜLLER",
  "SEILER",
  "SAUTER",
  "BALDWIN",
  "WURLITZER",
] as const;

/** Normalise une saisie libre : trim, espaces réduits, MAJUSCULES. */
function normalizeEntry(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

/** Normalise le libellé de type (« Droit » / « à Queue »). */
function typeKey(type?: string): "droit" | "queue" | null {
  const t = (type ?? "").toLowerCase();
  if (t.includes("queue")) return "queue";
  if (t.includes("droit")) return "droit";
  return null;
}

/** Catalogue final : catalogues spécifiques + catalogues standardisés dynamiques. */
export const BRAND_MODELS_BY_TYPE: Record<string, ModelCatalog> = (() => {
  const out: Record<string, ModelCatalog> = {};
  for (const [brand, catalog] of Object.entries(PIANO_MODELS_CATALOG)) {
    out[brand] = { droit: [...catalog.droit], queue: [...catalog.queue] };
  }
  for (const brand of SECONDARY_BRANDS) {
    if (!out[brand]) {
      out[brand] = {
        droit: [...SECONDARY_BRANDS_STANDARD_CATALOG.droit],
        queue: [...SECONDARY_BRANDS_STANDARD_CATALOG.queue],
      };
    }
  }
  return out;
})();

/** Tous les modèles d'une marque, sans distinction de type. */
export const BRAND_MODELS_SUGGESTIONS: Record<string, string[]> = Object.fromEntries(
  Object.entries(BRAND_MODELS_BY_TYPE).map(([brand, m]) => [brand, [...m.droit, ...m.queue]]),
);

/** Liste des marques connues. */
export const BRAND_SUGGESTIONS = Object.keys(BRAND_MODELS_BY_TYPE);

/** Modèles filtrés par marque et, si connu, par type de piano (exclusion stricte). */
export function modelsFor(brand: string, type?: string): string[] {
  const entry = BRAND_MODELS_BY_TYPE[brand.trim().toUpperCase()];
  if (!entry) return [];
  const t = typeKey(type);
  if (t === "droit") return entry.droit;
  if (t === "queue") return entry.queue;
  return [...entry.droit, ...entry.queue];
}

/** Groupes de modèles pour l'affichage en liste déroulante. */
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
