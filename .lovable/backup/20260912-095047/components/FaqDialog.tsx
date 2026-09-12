import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { FaqContent, faqTitle, type FaqPage } from "@/components/FaqContent";

/**
 * Fenêtre flottante (FF) des FAQ : fond blanc pur, 80 % de la largeur et de la
 * hauteur de l'écran, voile de fond très léger rgba(0,0,0,0.15).
 */
export function FaqDialog({
  open,
  onClose,
  page,
  en,
}: {
  open: boolean;
  onClose: () => void;
  page: FaqPage;
  en: boolean;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.15)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex flex-col rounded-lg border border-gray-300 shadow-xl"
        style={{ width: "80vw", height: "80vh", backgroundColor: "#FFFFFF" }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={faqTitle(page, en)}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
          <h2 className="text-base font-semibold !text-gray-900">{faqTitle(page, en)}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={en ? "Close" : "Fermer"}
            className="rounded-md p-1 !text-gray-600 transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 text-sm leading-relaxed !text-gray-800">
          <FaqContent page={page} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
