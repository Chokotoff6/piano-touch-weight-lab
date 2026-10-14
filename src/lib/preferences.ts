// Préférences utilisateur (roue dentée de l'en-tête) : corridor de tolérance
// et rendu de lissage par défaut. Stockage local persistant, store externe
// synchronisé entre onglets de l'application.
import { useSyncExternalStore } from "react";

export type SmoothPref = "real" | "smooth" | "smoothPlus";

type Preferences = {
  /** Corridor de tolérance en grammes (±2, ±3 ou ±4). */
  corridorG: 2 | 3 | 4;
  /** Rendu de lissage par défaut des graphiques. */
  smoothDefault: SmoothPref;
};

const CORRIDOR_KEY = "ptw_pref_corridor_g";
const SMOOTH_KEY = "ptw_pref_smooth";

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
  if (typeof window === "undefined") return { corridorG: 3, smoothDefault: "smooth" };
  const corridor = Number(read(CORRIDOR_KEY));
  const smooth = read(SMOOTH_KEY);
  return {
    corridorG: corridor === 2 || corridor === 4 ? corridor : 3,
    smoothDefault: smooth === "real" || smooth === "smoothPlus" ? smooth : "smooth",
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

export function setCorridorG(value: 2 | 3 | 4) {
  prefs = { ...prefs, corridorG: value };
  write(CORRIDOR_KEY, String(value));
  emit();
}

export function setSmoothDefault(value: SmoothPref) {
  prefs = { ...prefs, smoothDefault: value };
  write(SMOOTH_KEY, value);
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
