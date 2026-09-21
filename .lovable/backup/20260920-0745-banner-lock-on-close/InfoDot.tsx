import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFadeClose } from "@/lib/use-fade-close";

/**
 * Bouton « i » standardisé de toute l'application.
 * - Ouverture au clic uniquement (aucun survol), instantanée (aucune animation).
 * - Fermeture en fondu d'exactement 1 seconde.
 * - Fenêtre blanche contextuelle placée juste à côté de l'icône cliquée.
 * - Taille ajustée au texte, fermeture au clic extérieur ou sur la croix.
 * - Voile de fond unique et léger : rgba(0,0,0,0.15). Aucun « ? ».
 */
export function InfoDot({
  children,
  label,
  className,
  width = 320,
  icon,
  autoOpenSessionKey,
  autoOpenForeverKey,
  autoCloseMs = 5000,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
  /** Largeur maximale de la fenêtre (px) : elle se resserre au texte si possible. */
  width?: number;
  /** Contenu du déclencheur (par défaut la lettre « i »). */
  icon?: ReactNode;
  /** Ouvre une seule fois par session l'infobulle dès son apparition. */
  autoOpenSessionKey?: string;
  /** Ouvre l'infobulle une seule fois pour toute la vie du navigateur
      (verrou persistant en localStorage, prioritaire sur autoOpenSessionKey). */
  autoOpenForeverKey?: string;
  /** Durée d'ouverture avant le début du fondu automatique. */
  autoCloseMs?: number;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const finishClose = useCallback(() => setOpen(false), []);
  const { rendered, closing, requestClose } = useFadeClose(open, finishClose);

  useEffect(() => {
    if (autoOpenForeverKey) {
      // Usage unique absolu : verrou localStorage lu puis écrit immédiatement,
      // la bannière ne se rouvrira jamais (même après fermeture du navigateur).
      try {
        if (window.localStorage.getItem(autoOpenForeverKey) === "true") return;
        window.localStorage.setItem(autoOpenForeverKey, "true");
      } catch {
        /* stockage indisponible : l'aide reste utilisable manuellement */
      }
      setOpen(true);
      return;
    }
    if (!autoOpenSessionKey) return;
    try {
      if (window.sessionStorage.getItem(autoOpenSessionKey) === "1") return;
      window.sessionStorage.setItem(autoOpenSessionKey, "1");
    } catch {
      /* stockage indisponible : l'aide reste utilisable manuellement */
    }
    setOpen(true);
  }, [autoOpenSessionKey, autoOpenForeverKey]);

  useEffect(() => {
    if (!open || !autoOpenSessionKey) return;
    const timer = window.setTimeout(() => requestClose(), autoCloseMs);
    return () => window.clearTimeout(timer);
  }, [autoCloseMs, autoOpenSessionKey, open, requestClose]);

  useEffect(() => {
    if (!rendered) return;
    const place = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const margin = 8;
      let left = rect.right + margin;
      if (left + width > window.innerWidth - margin) {
        left = Math.max(margin, rect.left - width - margin);
      }
      const top = Math.max(margin, Math.min(rect.top - 6, window.innerHeight - 120));
      setPos({ left, top });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [rendered, width]);

  const overlay = (
    <div
      className={`fixed inset-0 z-[99999] ${closing ? "ff-closing" : ""}`}
      style={{ background: "rgba(0,0,0,0.15)" }}
      onClick={(event) => {
        event.stopPropagation();
        requestClose();
      }}
      role="presentation"
    >
      <div
        className="absolute rounded-lg border border-gray-300 py-3 pl-3 pr-7 text-left text-[12.5px] font-normal normal-case leading-snug !text-gray-900 shadow-xl"
        style={{
          backgroundColor: "#FFFFFF",
          left: pos?.left ?? 0,
          top: pos?.top ?? 0,
          width: "max-content",
          maxWidth: width,
          maxHeight: "70vh",
          overflowY: "auto",
          visibility: pos ? "visible" : "hidden",
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            requestClose();
          }}
          className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-sm leading-none !text-gray-500 hover:!text-gray-900"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label={label ?? "Info"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className={
          icon
            ? `inline-flex shrink-0 cursor-pointer items-center align-middle ${className ?? ""}`
            : `inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-foreground/60 align-middle text-[10px] font-bold normal-case leading-none text-foreground/70 ${className ?? ""}`
        }
      >
        {icon ?? "i"}
      </button>
      {rendered && typeof document !== "undefined" ? createPortal(overlay, document.body) : null}
    </>
  );
}

export default InfoDot;
