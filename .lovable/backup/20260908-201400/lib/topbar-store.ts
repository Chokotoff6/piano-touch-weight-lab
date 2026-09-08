import { useSyncExternalStore } from "react";

export type TopbarAlert = { anchor: "save" | "compare" | "export" | "import"; message: string } | null;

export type HistoryRowRef = { id: string; label: string };

type TopbarState = {
  exportReady: boolean;
  measuresReady: boolean;
  serialFilled: boolean;
  isExporting: boolean;
  isDirty: boolean;
  hasSaved: boolean;
  alert: TopbarAlert;
  historyRows: HistoryRowRef[];
  /** Seuil minimal de pesée franchi sur la page Saisie (débloque "Résultats"). */
  gateReady: boolean;
  /** Consentement RGPD validé sur la page Résultats (débloque "Comparer"). */
  compareUnlocked: boolean;
};

const GATE_KEY = "ptw_gate_ready";
const UNLOCK_KEY = "ptw_compare_unlocked";

let state: TopbarState = {
  exportReady: false,
  measuresReady: false,
  serialFilled: false,
  isExporting: false,
  isDirty: false,
  hasSaved: false,
  alert: null,
  historyRows: [],
  gateReady: false,
  compareUnlocked: false,
};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setTopbarState(next: Partial<TopbarState>) {
  state = { ...state, ...next };
  emit();
}

/** Restaure les jalons du parcours depuis le stockage local (appel client). */
export function initJourneyFlags() {
  if (typeof window === "undefined") return;
  try {
    setTopbarState({
      gateReady: window.localStorage.getItem(GATE_KEY) === "1",
      compareUnlocked: window.localStorage.getItem(UNLOCK_KEY) === "1",
    });
  } catch {
    /* stockage indisponible */
  }
}

export function setGateReady(ready: boolean) {
  try {
    window.localStorage.setItem(GATE_KEY, ready ? "1" : "0");
  } catch {
    /* stockage indisponible */
  }
  setTopbarState({ gateReady: ready });
}

export function setCompareUnlocked(unlocked: boolean) {
  try {
    window.localStorage.setItem(UNLOCK_KEY, unlocked ? "1" : "0");
  } catch {
    /* stockage indisponible */
  }
  setTopbarState({ compareUnlocked: unlocked });
}

let alertTimer: ReturnType<typeof setTimeout> | null = null;

export function showTopbarAlert(anchor: "save" | "compare" | "export" | "import", message: string) {
  if (alertTimer) clearTimeout(alertTimer);
  setTopbarState({ alert: { anchor, message } });
  alertTimer = setTimeout(() => {
    setTopbarState({ alert: null });
    alertTimer = null;
  }, 8000);
}

export function clearTopbarAlert() {
  if (alertTimer) clearTimeout(alertTimer);
  alertTimer = null;
  setTopbarState({ alert: null });
}

export function getTopbarState() {
  return state;
}

export function useTopbarState() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => state,
    () => state,
  );
}
