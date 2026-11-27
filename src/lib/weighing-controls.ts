import { useEffect, useState } from "react";

/** Commandes de pesée partagées entre Vue Complète et Vue Octave (session de l'onglet). */
const read = <T,>(key: string): T | null => {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
};

/** État relu au montage et à chaque changement de `reload`, réécrit à chaque changement. */
export function useSharedControl<T>(key: string, initial: T, reload?: unknown) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const stored = read<T>(key);
    if (stored !== null) setValue(stored);
    setReady(true);
  }, [key, reload]);
  useEffect(() => {
    if (!ready) return;
    try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
  }, [key, value, ready]);
  return [value, setValue] as const;
}
