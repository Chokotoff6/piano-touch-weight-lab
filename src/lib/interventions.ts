// Liste configurable des types d'intervention (points d'historique).
// Stockage local persistant ; les entrées d'usine sont bilingues, les ajouts restent dans leur langue d'origine.
import { useSyncExternalStore } from "react";

export type Intervention = { id: string; fr: string; en: string };

export const INITIAL_DIAGNOSTIC_ID = "initial";

export const FACTORY_INTERVENTIONS: Intervention[] = [
  { id: INITIAL_DIAGNOSTIC_ID, fr: "Diagnostic initial", en: "Initial diagnostic" },
  { id: "tuning", fr: "Accord", en: "Tuning" },
  { id: "regulation", fr: "Régulation mécanique", en: "Action regulation" },
  { id: "lighten", fr: "Allègement des plombs", en: "Key lead removal" },
  { id: "weighten", fr: "Alourdissement des plombs", en: "Key lead addition" },
  { id: "hammers", fr: "Changement de marteaux", en: "Hammer replacement" },
  { id: "voicing", fr: "Harmonisation", en: "Voicing" },
  { id: "final", fr: "Contrôle final", en: "Final check" },
];

const KEY = "ptw_interventions";
const listeners = new Set<() => void>();

function load(): Intervention[] {
  try {
    if (typeof window === "undefined") return FACTORY_INTERVENTIONS;
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(raw) && raw.every((x) => x && typeof x.id === "string" && typeof x.fr === "string" && typeof x.en === "string")) return raw;
  } catch { /* stockage indisponible */ }
  return FACTORY_INTERVENTIONS;
}

let list: Intervention[] = load();

function save(next: Intervention[]) {
  list = next;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* stockage indisponible */ }
  listeners.forEach((l) => l());
}

export const interventionLabel = (i: Intervention, en: boolean) => (en ? i.en : i.fr);

/** Étiquettes qui classent le piano pour les filtres Cloud (codes de maintenance historiques). */
const MAJOR_IDS = new Set(["lighten", "weighten", "hammers"]);
const CUSTOM_IDS = new Set(["regulation"]);
export const ANTECEDENTS_KEY = "antecedents";

/** Catalogue enrichi des antécédents avant KeyWeight, distinct de la liste courte des points d'historique.
 *  Les ids historiques (regulation, lighten, weighten, hammers, tuning, voicing) sont conservés pour compatibilité. */
export type AntecedentGroup = { id: string; fr: string; en: string; items: Intervention[] };
const FACTORY_ANTECEDENT_GROUPS: AntecedentGroup[] = [
  { id: "action", fr: "Mécanique & Clavier", en: "Action & Keyboard", items: [
    { id: "regulation", fr: "Régulation mécanique complète", en: "Full action regulation" },
    { id: "bushings", fr: "Garnissage des mortaises de clavier", en: "Key bushing replacement" },
    { id: "centerpins", fr: "Réfection des axes (fourches, centres)", en: "Center pin repinning" },
    { id: "lighten", fr: "Allègement des plombs", en: "Key lead removal" },
    { id: "weighten", fr: "Alourdissement des plombs", en: "Key lead addition" },
    { id: "hammers", fr: "Remplacement des marteaux", en: "Hammer replacement" },
    { id: "dampers", fr: "Remplacement des feutres d'étouffoirs", en: "Damper felt replacement" },
    { id: "felts", fr: "Remplacement feutres & garnitures", en: "Felts & cloths replacement" },
  ] },
  { id: "structure", fr: "Structure & Lutherie lourde", en: "Structure & heavy repairs", items: [
    { id: "restring", fr: "Recordage complet (acier & basses)", en: "Full restringing" },
    { id: "repin", fr: "Rechevillage / Nouveau sommier", en: "Repinning / New pinblock" },
    { id: "soundboard", fr: "Réfection / Réparation table d'harmonie", en: "Soundboard repair / rebuild" },
    { id: "bridges", fr: "Remplacement ou réfection des chevalets", en: "Bridge replacement / repair" },
    { id: "restoration", fr: "Restauration complète de l'instrument", en: "Full instrument restoration" },
  ] },
  { id: "sound", fr: "Son & Harmonisation", en: "Sound & Voicing", items: [
    { id: "tuning", fr: "Accord", en: "Tuning" },
    { id: "voicing", fr: "Harmonisation", en: "Voicing" },
    { id: "hammer_filing", fr: "Ponçage des marteaux", en: "Hammer filing" },
  ] },
  { id: "equipment", fr: "Équipements", en: "Equipment", items: [
    { id: "humidity", fr: "Installation système hygrométrique", en: "Humidity control system" },
    { id: "silent", fr: "Installation système silencieux", en: "Silent system" },
  ] },
];
/** Mots-clés techniques de recherche (synonymes métier, FR/EN) par tâche. */
export const ANTECEDENT_KEYWORDS: Record<string, string> = {
  regulation: "reglage echappement enfoncement chute mecanique regulation",
  bushings: "mortaise mortaises balancier enfoncement bushing bushings garniture clavier jeu touche",
  centerpins: "axe axes fourche fourches centre friction frottement grippe center pin",
  lighten: "plomb plombs plombage poids allegement lead",
  weighten: "plomb plombs plombage poids alourdissement lead",
  hammers: "marteau marteaux tete tetes hammer",
  dampers: "etouffoir etouffoirs feutre damper",
  felts: "feutre feutres garniture drap cuir mouche felt",
  restring: "corde cordes recordage filee basses acier string",
  repin: "cheville chevilles sommier rechevillage tenue accord pinblock pin",
  soundboard: "table harmonie flipot flipots fente barrage soundboard",
  bridges: "chevalet chevalets pointe bridge",
  restoration: "restauration renovation complete",
  tuning: "accord diapason tuning",
  voicing: "harmonisation piquage son timbre voicing",
  hammer_filing: "poncage marteau marteaux mise en forme filing",
  humidity: "hygrometrie humidite dampp chaser hygrometrique",
  silent: "silencieux silent sourdine",
};
/** Catalogue effectif = usine + ajouts − retraits (overlay localStorage, hors ligne).
 *  Les tableaux exportés sont mis à jour en place pour que tous les lecteurs existants suivent. */
type CatalogOverlay = { added: Record<string, Intervention[]>; removed: string[] };
const CATALOG_KEY = "ptw_antecedent_catalog";
const catalogListeners = new Set<() => void>();
let catalogVersion = 0;
function loadOverlay(): CatalogOverlay {
  try {
    if (typeof window === "undefined") return { added: {}, removed: [] };
    const raw = JSON.parse(window.localStorage.getItem(CATALOG_KEY) ?? "null");
    if (raw && typeof raw.added === "object" && Array.isArray(raw.removed)) return raw;
  } catch { /* stockage indisponible */ }
  return { added: {}, removed: [] };
}
let overlay = loadOverlay();
export const ANTECEDENT_GROUPS: AntecedentGroup[] = FACTORY_ANTECEDENT_GROUPS.map((g) => ({ ...g, items: [] }));
export const ANTECEDENT_ITEMS: Intervention[] = [];
function rebuildCatalog() {
  const removed = new Set(overlay.removed);
  ANTECEDENT_GROUPS.forEach((g, i) => {
    const next = [...FACTORY_ANTECEDENT_GROUPS[i]!.items, ...(overlay.added[g.id] ?? [])].filter((it) => !removed.has(it.id));
    g.items.length = 0; g.items.push(...next);
  });
  ANTECEDENT_ITEMS.length = 0; ANTECEDENT_ITEMS.push(...ANTECEDENT_GROUPS.flatMap((g) => g.items));
}
rebuildCatalog();
function saveOverlay(next: CatalogOverlay) {
  overlay = next; rebuildCatalog(); catalogVersion += 1;
  try { window.localStorage.setItem(CATALOG_KEY, JSON.stringify(next)); } catch { /* stockage indisponible */ }
  catalogListeners.forEach((l) => l());
}
export function addCatalogItem(groupId: string, label: string) {
  const l = label.trim();
  if (!l || ANTECEDENT_ITEMS.some((i) => i.fr.toLowerCase() === l.toLowerCase() || i.en.toLowerCase() === l.toLowerCase())) return;
  saveOverlay({ ...overlay, added: { ...overlay.added, [groupId]: [...(overlay.added[groupId] ?? []), { id: `cat_${Date.now().toString(36)}`, fr: l, en: l }] } });
}
export function removeCatalogItem(id: string) {
  const added = Object.fromEntries(Object.entries(overlay.added).map(([k, v]) => [k, v.filter((i) => i.id !== id)]));
  const factory = FACTORY_ANTECEDENT_GROUPS.some((g) => g.items.some((i) => i.id === id));
  saveOverlay({ added, removed: factory ? [...overlay.removed, id] : overlay.removed });
}
export function resetCatalog() { saveOverlay({ added: {}, removed: [] }); }
export function useAntecedentCatalog(): number {
  return useSyncExternalStore((cb) => { catalogListeners.add(cb); return () => { catalogListeners.delete(cb); }; }, () => catalogVersion, () => 0);
}
export const parseAntecedents = (raw: string | undefined): string[] =>
  String(raw ?? "").split("|").map((s) => s.trim()).filter(Boolean);
/** Déduit le code Cloud (Standard / Custom regulations / Major modifications) des antécédents cochés. */
export function maintenanceFromAntecedents(ids: string[]): string {
  if (ids.length === 0) return "";
  if (ids.some((id) => MAJOR_IDS.has(id))) return "Major modifications";
  if (ids.some((id) => CUSTOM_IDS.has(id))) return "Custom regulations";
  return "Standard";
}

export function getInterventions(): Intervention[] { return list; }

export function addIntervention(label: string) {
  const l = label.trim();
  if (!l || list.some((i) => i.fr.toLowerCase() === l.toLowerCase() || i.en.toLowerCase() === l.toLowerCase())) return;
  save([...list, { id: `custom_${Date.now().toString(36)}`, fr: l, en: l }]);
}
export function removeIntervention(id: string) { save(list.filter((i) => i.id !== id)); }
export function moveIntervention(id: string, delta: -1 | 1) {
  const i = list.findIndex((x) => x.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return;
  const next = [...list];
  [next[i], next[j]] = [next[j]!, next[i]!];
  save(next);
}
export function resetInterventions() { save(FACTORY_INTERVENTIONS); }

export function useInterventions(): Intervention[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => list,
    () => FACTORY_INTERVENTIONS,
  );
}
