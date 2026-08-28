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
};

let state: TopbarState = {
  exportReady: false,
  measuresReady: false,
  serialFilled: false,
  isExporting: false,
  isDirty: false,
  hasSaved: false,
  alert: null,
  historyRows: [],
};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setTopbarState(next: Partial<TopbarState>) {
  state = { ...state, ...next };
  emit();
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
