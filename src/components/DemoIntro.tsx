import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFadeClose } from "@/lib/use-fade-close";

export const DEMO_INFO_FR =
  "Mode Démo pré-remplit l'application avec un jeu de données permettant de tester les différents modules.\nLa base de données CLOUD utilisée est également fictive.";
export const DEMO_INFO_EN =
  "Demo Mode pre-populates the application with a dataset allowing you to test the different modules.\nThe CLOUD database used is also virtual.";

const SEEN_KEY = "ptw_demo_intro_seen";

/**
 * Cinématique de bienvenue : à la toute première arrivée sur l'accueil, la
 * fenêtre explicative du Mode Démo s'ouvre en cut, reste 5 secondes puis
 * disparaît en fondu d'une seconde (ou se ferme au clic extérieur).
 */
export function DemoIntro({ en }: { en: boolean }) {
  const [open, setOpen] = useState(false);
  const { rendered, closing, requestClose } = useFadeClose(open, () => setOpen(false));

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SEEN_KEY) === "1") return;
      window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* stockage indisponible */
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => requestClose(), 5000);
    return () => clearTimeout(timer);
  }, [open, requestClose]);

  if (!rendered || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[99997] flex items-center justify-center p-4 ${closing ? "ff-closing" : ""}`}
      style={{ background: "rgba(0,0,0,0.15)" }}
      onClick={requestClose}
      role="presentation"
    >
      <div
        className="max-w-md whitespace-pre-line rounded-lg border border-gray-300 p-5 text-left text-base leading-relaxed !text-gray-900 shadow-xl"
        style={{ backgroundColor: "#FFFFFF" }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {en ? DEMO_INFO_EN : DEMO_INFO_FR}
      </div>
    </div>,
    document.body,
  );
}
