import { useSyncExternalStore } from "react";

export type TopbarAlert = { anchor: "save" | "compare" | "export"; message: string } | null;

type TopbarState = {
  exportReady: boolean;
  isExporting: boolean;
  isDirty: boolean;
  hasSaved: boolean;
  alert: TopbarAlert;
};

let state: TopbarState = {
  exportReady: false,
  isExporting: false,
  isDirty: false,
  hasSaved: false,
  alert: null,
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

export function showTopbarAlert(anchor: "save" | "compare" | "export", message: string) {
  if (alertTimer) clearTimeout(alertTimer);
  setTopbarState({ alert: { anchor, message } });
  alertTimer = setTimeout(() => {
    setTopbarState({ alert: null });
    alertTimer = null;
  }, 5000);
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
