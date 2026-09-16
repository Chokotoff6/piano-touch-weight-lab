import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFadeClose } from "@/lib/use-fade-close";

export const DEMO_INFO_FR =
  "Le Mode Démo pré-remplit instantanément l'application avec un jeu complet de données de test (88 touches) permettant de tester les différents modules et la base de données de profils de pianos CLOUD est fictive.";
export const DEMO_INFO_EN =
  "Demo Mode instantly pre-populates the app with a complete test dataset (88 keys) to test the different modules and the CLOUD piano profile database is fictitious.";

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
      if (window.localStorage.getItem(SEEN_KEY) === "1") return;
      window.localStorage.setItem(SEEN_KEY, "1");
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
        className="max-w-md rounded-lg border border-gray-300 p-5 text-left text-sm leading-relaxed !text-gray-900 shadow-xl"
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
