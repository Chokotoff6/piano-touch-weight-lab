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

// ---------------------------------------------------------------------------
// Personnalisation locale du catalogue (ajouts appris / suppressions), hors ligne.
// ---------------------------------------------------------------------------
type TypeKey = "droit" | "queue";
type ModelOverrides = {
  added: Record<string, Partial<Record<TypeKey, string[]>>>;
  removed: Record<string, Partial<Record<TypeKey, string[]>>>;
};
const MODEL_OVERRIDES_KEY = "ptw_model_overrides";
const listeners = new Set<() => void>();

function readOverrides(): ModelOverrides {
  try {
    if (typeof window === "undefined") return { added: {}, removed: {} };
    const o = JSON.parse(window.localStorage.getItem(MODEL_OVERRIDES_KEY) ?? "null");
    if (o && typeof o === "object") return { added: o.added ?? {}, removed: o.removed ?? {} };
  } catch { /* stockage indisponible */ }
  return { added: {}, removed: {} };
}
function writeOverrides(o: ModelOverrides) {
  try { window.localStorage.setItem(MODEL_OVERRIDES_KEY, JSON.stringify(o)); } catch { /* stockage indisponible */ }
  listeners.forEach((l) => l());
}
export function subscribeModelCatalog(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Liste effective (usine + ajouts − suppressions), triée alphanumériquement (U1, U2… U10). */
export function effectiveModels(brand: string, t: TypeKey): string[] {
  const b = brand.trim().toUpperCase();
  const o = readOverrides();
  const base = BRAND_MODELS_BY_TYPE[b]?.[t] ?? [];
  const removed = new Set((o.removed[b]?.[t] ?? []).map(normalizeEntry));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of [...base, ...(o.added[b]?.[t] ?? [])]) {
    const n = normalizeEntry(m);
    if (!n || removed.has(n) || seen.has(n)) continue;
    seen.add(n);
    out.push(m);
  }
  return out.sort((x, y) => x.localeCompare(y, undefined, { numeric: true, sensitivity: "base" }));
}

/** Clé de comparaison tolérante : casse, espaces et tirets ignorés (K-500 = K500 = k 500). */
export function modelKey(value: string): string {
  return (value ?? "").toUpperCase().replace(/[\s\-_.]+/g, "");
}

/** Modèle d'usine le plus long servant de racine à la saisie (sans couper un nombre : U1 ≠ U10). */
function factoryRoot(brand: string, model: string): string | null {
  const b = brand.trim().toUpperCase();
  const cat = BRAND_MODELS_BY_TYPE[b];
  if (!cat) return null;
  const k = modelKey(model);
  let best: string | null = null;
  for (const m of [...cat.droit, ...cat.queue]) {
    const mk = modelKey(m);
    if (!mk || !k.startsWith(mk)) continue;
    const next = k.charAt(mk.length);
    if (next && /\d/.test(next) && /\d/.test(mk.charAt(mk.length - 1))) continue;
    if (!best || mk.length > modelKey(best).length) best = m;
  }
  return best;
}

/** Remplace le préfixe saisi par la graphie d'usine (k500 aures 2 → K-500 aures 2), suite inchangée. */
export function canonicalizeModel(brand: string, model: string): string {
  const v = model.trim().replace(/\s+/g, " ");
  const root = factoryRoot(brand, v);
  if (!root) return v;
  const target = modelKey(root).length;
  let count = 0;
  let i = 0;
  while (i < v.length && count < target) {
    if (!/[\s\-_.]/.test(v[i]!)) count += 1;
    i += 1;
  }
  const rest = v.slice(i).replace(/^[\s\-_.]+/, "");
  return rest ? `${root} ${rest}` : root;
}

/** Clé de la racine (modèle d'usine) pour le regroupement « toutes versions ». */
export function modelRootKey(brand: string, model: string): string {
  const root = factoryRoot(brand, model);
  return modelKey(root ?? model);
}

/** Ajoute un modèle pour une marque et un type (apprentissage ou ajout manuel). */
export function addModel(brand: string, type: string | undefined, model: string): void {
  const b = brand.trim().toUpperCase();
  const t = typeKey(type);
  const m = model.trim().replace(/\s+/g, " ");
  if (!b || !t || !m) return;
  if (effectiveModels(b, t).some((x) => normalizeEntry(x) === normalizeEntry(m))) return;
  const o = readOverrides();
  const rem = o.removed[b]?.[t];
  if (rem) o.removed[b]![t] = rem.filter((x) => normalizeEntry(x) !== normalizeEntry(m));
  const isFactory = (BRAND_MODELS_BY_TYPE[b]?.[t] ?? []).some((x) => normalizeEntry(x) === normalizeEntry(m));
  if (!isFactory) {
    o.added[b] = o.added[b] ?? {};
    o.added[b]![t] = [...(o.added[b]![t] ?? []), m];
  }
  writeOverrides(o);
}

export function removeModel(brand: string, t: TypeKey, model: string): void {
  const b = brand.trim().toUpperCase();
  const o = readOverrides();
  const added = o.added[b]?.[t];
  if (added) o.added[b]![t] = added.filter((x) => normalizeEntry(x) !== normalizeEntry(model));
  if ((BRAND_MODELS_BY_TYPE[b]?.[t] ?? []).some((x) => normalizeEntry(x) === normalizeEntry(model))) {
    o.removed[b] = o.removed[b] ?? {};
    o.removed[b]![t] = [...(o.removed[b]![t] ?? []), model];
  }
  writeOverrides(o);
}

/** Restaure la liste d'usine pour une marque et un type. */
export function resetModels(brand: string, t: TypeKey): void {
  const b = brand.trim().toUpperCase();
  const o = readOverrides();
  if (o.added[b]) delete o.added[b]![t];
  if (o.removed[b]) delete o.removed[b]![t];
  writeOverrides(o);
}

/** Marques connues + marques apprises localement. */
export function knownBrands(): string[] {
  const o = readOverrides();
  return Array.from(new Set([...BRAND_SUGGESTIONS, ...Object.keys(o.added)])).sort((a, b) => a.localeCompare(b));
}

const hasBrand = (brand: string) => {
  const b = brand.trim().toUpperCase();
  return Boolean(BRAND_MODELS_BY_TYPE[b] || readOverrides().added[b]);
};

/** Modèles filtrés par marque et, si connu, par type de piano (exclusion stricte). */
export function modelsFor(brand: string, type?: string): string[] {
  if (!hasBrand(brand)) return [];
  const t = typeKey(type);
  if (t) return effectiveModels(brand, t);
  return [...effectiveModels(brand, "droit"), ...effectiveModels(brand, "queue")];
}

/** Groupes de modèles pour l'affichage en liste déroulante. */
export function modelGroupsFor(brand: string, type?: string) {
  if (!hasBrand(brand)) return [];
  const t = typeKey(type);
  if (t === "droit") return [{ label: "Droits", options: effectiveModels(brand, "droit") }];
  if (t === "queue") return [{ label: "De queue", options: effectiveModels(brand, "queue") }];
  return [
    { label: "Droits", options: effectiveModels(brand, "droit") },
    { label: "De queue", options: effectiveModels(brand, "queue") },
  ];
}

/** Déduit le type de piano à partir d'un modèle connu du dictionnaire. */
export function inferTypeFromModel(brand: string, model: string): PianoType | null {
  if (!hasBrand(brand) || !model.trim()) return null;
  const normalized = normalizeEntry(model);
  if (effectiveModels(brand, "droit").some((m) => normalizeEntry(m) === normalized)) return "Droit";
  if (effectiveModels(brand, "queue").some((m) => normalizeEntry(m) === normalized)) return "à Queue";
  return null;
}
