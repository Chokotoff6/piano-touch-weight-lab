// Préférences utilisateur (roue dentée de l'en-tête) : corridor de tolérance
// et rendu de lissage par défaut. Stockage local persistant, store externe
// synchronisé entre onglets de l'application.
import { useSyncExternalStore } from "react";

export type SmoothPref = "real" | "smooth" | "smoothPlus";

/** Rampe de cible : PD/PR de La0 (touche 1) au dernier Do (touche 88). */
export type TargetRamp = { wdStart: number; wdEnd: number; waStart: number; waEnd: number };
export type TargetKind = "upright" | "grand";
export const DEFAULT_TARGETS: Record<TargetKind, TargetRamp> = {
  grand: { wdStart: 52, wdEnd: 47, waStart: 20, waEnd: 23 },
  upright: { wdStart: 55, wdEnd: 50, waStart: 25, waEnd: 28 },
};

type Preferences = {
  /** Corridor de tolérance en grammes (±2, ±3 ou ±4). */
  corridorG: number;
  /** Rendu de lissage par défaut des graphiques. */
  smoothDefault: SmoothPref;
  /** Touches hors tolérance surlignées en rouge dans le PDF. */
  pdfRedKeys: boolean;
  /** Avance automatique après 2 chiffres valides. */
  autoAdvance: boolean;
  /** Cible standard : défaut (selon type) ou personnalisée. */
  targetMode: "default" | "custom";
  customTargets: Record<TargetKind, TargetRamp>;
};

const CORRIDOR_KEY = "ptw_pref_corridor_g";
const SMOOTH_KEY = "ptw_pref_smooth";
const PDF_RED_KEY = "ptw_pref_pdf_red";
const AUTO_ADV_KEY = "ptw_pref_auto_advance";
const TARGET_MODE_KEY = "ptw_pref_target_mode";
const TARGET_CUSTOM_KEY = "ptw_pref_target_custom";

function loadCustom(): Record<TargetKind, TargetRamp> {
  try {
    const raw = JSON.parse(read(TARGET_CUSTOM_KEY) ?? "null");
    const ok = (r: unknown): r is TargetRamp => !!r && typeof r === "object" &&
      ["wdStart", "wdEnd", "waStart", "waEnd"].every((k) => Number.isFinite((r as Record<string, number>)[k]));
    return { grand: ok(raw?.grand) ? raw.grand : DEFAULT_TARGETS.grand, upright: ok(raw?.upright) ? raw.upright : DEFAULT_TARGETS.upright };
  } catch {
    return { ...DEFAULT_TARGETS };
  }
}

const read = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible */
  }
};

function load(): Preferences {
  if (typeof window === "undefined") return { corridorG: 3, smoothDefault: "smooth", pdfRedKeys: true, autoAdvance: true, targetMode: "default", customTargets: { ...DEFAULT_TARGETS } };
  const rawCorridor = read(CORRIDOR_KEY);
  const corridor = rawCorridor === null || rawCorridor === "" ? NaN : Number(rawCorridor);
  const smooth = read(SMOOTH_KEY);
  return {
    // 0 = alerte désactivée dans les faits.
    corridorG: Number.isFinite(corridor) && corridor >= 0 ? corridor : 3,
    smoothDefault: smooth === "real" || smooth === "smoothPlus" ? smooth : "smooth",
    pdfRedKeys: read(PDF_RED_KEY) !== "0",
    autoAdvance: read(AUTO_ADV_KEY) !== "0",
    targetMode: read(TARGET_MODE_KEY) === "custom" ? "custom" : "default",
    customTargets: loadCustom(),
  };
}

let prefs: Preferences = load();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getPreferences(): Preferences {
  return prefs;
}

export function setCorridorG(value: number) {
  if (!Number.isFinite(value) || value < 0) return;
  prefs = { ...prefs, corridorG: value };
  write(CORRIDOR_KEY, String(value));
  emit();
}

export function setSmoothDefault(value: SmoothPref) {
  prefs = { ...prefs, smoothDefault: value };
  write(SMOOTH_KEY, value);
  emit();
}

export function setPdfRedKeys(value: boolean) {
  prefs = { ...prefs, pdfRedKeys: value };
  write(PDF_RED_KEY, value ? "1" : "0");
  emit();
}

export function setAutoAdvance(value: boolean) {
  prefs = { ...prefs, autoAdvance: value };
  write(AUTO_ADV_KEY, value ? "1" : "0");
  emit();
}

export function setTargetMode(value: "default" | "custom") {
  prefs = { ...prefs, targetMode: value };
  write(TARGET_MODE_KEY, value);
  emit();
}

export function setCustomTarget(kind: TargetKind, ramp: TargetRamp) {
  prefs = { ...prefs, customTargets: { ...prefs.customTargets, [kind]: ramp } };
  write(TARGET_CUSTOM_KEY, JSON.stringify(prefs.customTargets));
  emit();
}

/** Rampe effective pour un type donné selon le mode choisi. */
export function effectiveTarget(kind: TargetKind, p: Preferences = prefs): TargetRamp {
  return p.targetMode === "custom" ? p.customTargets[kind] : DEFAULT_TARGETS[kind];
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => prefs,
    () => prefs,
  );
}
