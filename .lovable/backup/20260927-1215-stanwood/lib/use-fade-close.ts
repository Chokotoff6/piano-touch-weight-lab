import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cinématique unique de toutes les fenêtres flottantes :
 * - ouverture instantanée (aucune animation d'entrée) ;
 * - fermeture en fondu d'exactement 1 seconde.
 */
export function useFadeClose(open: boolean, onClose: () => void, duration = 1000) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      setRendered(true);
      setClosing(false);
    }
  }, [open]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const requestClose = useCallback(() => {
    if (timer.current) return;
    setClosing(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setClosing(false);
      setRendered(false);
      onClose();
    }, duration);
  }, [duration, onClose]);

  return { rendered, closing, requestClose };
}
