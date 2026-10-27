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
