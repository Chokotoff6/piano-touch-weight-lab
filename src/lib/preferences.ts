// Préférences utilisateur (roue dentée de l'en-tête) : corridor de tolérance
// et rendu de lissage par défaut. Stockage local persistant, store externe
// synchronisé entre onglets de l'application.
import { useSyncExternalStore } from "react";

export type SmoothPref = "real" | "smooth" | "smoothPlus";

type Preferences = {
  /** Corridor de tolérance en grammes (±2, ±3 ou ±4). */
  corridorG: number;
  /** Rendu de lissage par défaut des graphiques. */
  smoothDefault: SmoothPref;
  /** Touches hors tolérance surlignées en rouge dans le PDF. */
  pdfRedKeys: boolean;
  /** Avance automatique après 2 chiffres valides. */
  autoAdvance: boolean;
};

const CORRIDOR_KEY = "ptw_pref_corridor_g";
const SMOOTH_KEY = "ptw_pref_smooth";
const PDF_RED_KEY = "ptw_pref_pdf_red";
const AUTO_ADV_KEY = "ptw_pref_auto_advance";

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
  if (typeof window === "undefined") return { corridorG: 3, smoothDefault: "smooth", pdfRedKeys: true, autoAdvance: true };
  const corridor = Number(read(CORRIDOR_KEY));
  const smooth = read(SMOOTH_KEY);
  return {
    corridorG: Number.isFinite(corridor) && corridor > 0 ? corridor : 3,
    smoothDefault: smooth === "real" || smooth === "smoothPlus" ? smooth : "smooth",
    pdfRedKeys: read(PDF_RED_KEY) !== "0",
    autoAdvance: read(AUTO_ADV_KEY) !== "0",
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
  if (!Number.isFinite(value) || value <= 0) return;
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
