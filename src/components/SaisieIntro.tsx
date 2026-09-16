import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFadeClose } from "@/lib/use-fade-close";

/**
 * Note d'information affichée à l'arrivée sur la page Saisie : ouverture en
 * cut, 5 secondes à l'écran, puis disparition en fondu (ou au clic extérieur).
 */
export function SaisieIntro({ en }: { en: boolean }) {
  const [open, setOpen] = useState(false);
  const { rendered, closing, requestClose } = useFadeClose(open, () => setOpen(false));

  useEffect(() => {
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
        <span className="block">
          {en
            ? "Enter at least the values for every C and C# to access the results."
            : "Saisir au minimum les valeurs pour tous les Do et Do# pour accéder aux résultats."}
        </span>
        <span className="mt-2 block">
          {en ? "• TAB: move forward one key" : "• TAB : avance d'une touche"}
        </span>
        <span className="block">
          {en ? "• Shift + TAB: move backward one key" : "• Shift + TAB : recule d'une touche"}
        </span>
        <span className="block">
          {en
            ? "• ALT + TAB (Option ⌥ on Mac): jump to the next C"
            : "• ALT + TAB (Option ⌥ sur Mac) : saute au DO suivant"}
        </span>
      </div>
    </div>,
    document.body,
  );
}
