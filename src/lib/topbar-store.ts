import { useSyncExternalStore } from "react";

type TopbarState = {
  exportReady: boolean;
  isExporting: boolean;
};

let state: TopbarState = { exportReady: false, isExporting: false };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setTopbarState(next: Partial<TopbarState>) {
  state = { ...state, ...next };
  emit();
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
  );
}
