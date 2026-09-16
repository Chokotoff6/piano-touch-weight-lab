import { useState } from "react";
import { LegalDialog, LEGAL_TITLE } from "@/data/legal";

/**
 * Pied de page fin et permanent, présent sur toutes les pages.
 * Fond blanc, fine ligne de séparation en haut, calé en bas de l'écran.
 */
export function AppFooter({ en }: { en: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <footer
        data-pdf-hide
        className="fixed inset-x-0 bottom-0 z-[40] border-t border-border bg-white py-1 text-center print:hidden"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[0.7rem] !text-gray-500 underline transition-colors hover:!text-gray-800"
        >
          {en ? "Legal Notice, GDPR & Terms of Use" : LEGAL_TITLE}
        </button>
      </footer>
      <LegalDialog open={open} onClose={() => setOpen(false)} en={en} zIndex={100002} />
    </>
  );
}
