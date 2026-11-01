import { useEffect, useState, type ReactNode } from "react";

/**
 * Règle commune des infobulles d'erreur : affichage à l'apparition de l'erreur,
 * extinction après 3 s ou au premier clic n'importe où. Réarmée quand `resetKey` change.
 */
export function AutoDismissAlert({
  show,
  resetKey,
  className,
  children,
  delay = 3000,
}: {
  show: boolean;
  resetKey?: string | number;
  className?: string;
  children: ReactNode;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), delay);
    const onPointer = () => setVisible(false);
    // Armé au tick suivant pour ignorer le clic qui a déclenché l'erreur.
    const armTimer = window.setTimeout(() => document.addEventListener("pointerdown", onPointer, true), 0);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(armTimer);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [show, resetKey, delay]);

  if (!visible) return null;
  return (
    <span role="alert" className={className}>
      {children}
    </span>
  );
}
