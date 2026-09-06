import { useState } from "react";
import { Info, X } from "lucide-react";
import { useLang } from "@/data/translations";

/** Contenu bilingue partagé (overlay /comparer et bas de page d'accueil). */
export function BrandTargetInfoContent() {
  const en = useLang() === "en";
  return (
    <div className="text-sm leading-relaxed text-foreground">
      <h3 className="mb-3 text-base font-bold">
        {en ? "About Generic Target Curves" : "À propos des courbes Cibles Génériques"}
      </h3>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <span className="font-semibold">{en ? "Generic Targets:" : "Cibles Génériques :"}</span>{" "}
          {en
            ? "These reference dataset benchmarks are indicative and generic for the selected brand. They are not specific to any particular model or production year."
            : "Ces données de référence sont indicatives et génériques pour la marque sélectionnée. Elles ne sont pas spécifiques à un modèle précis ni à une année de fabrication particulière."}
        </li>
        <li>
          <span className="font-semibold">{en ? "Intellectual Property:" : "Propriété intellectuelle :"}</span>{" "}
          {en
            ? "This application is an entirely independent tool. Mentioned brands (Yamaha, Kawai, Steinway & Sons, etc.) are the exclusive property of their respective copyright holders. This service is neither affiliated with, endorsed by, nor sponsored by these manufacturers."
            : "Cette application est un outil totalement indépendant. Les marques mentionnées (Yamaha, Kawai, Steinway & Sons, etc.) sont la propriété exclusive de leurs titulaires de copyright. Ce service n'est ni affilié, ni agréé, ni soutenu par ces constructeurs."}
        </li>
      </ul>
    </div>
  );
}

/** Petite icône "i" ouvrant l'overlay d'information juridique. */
export function BrandTargetInfoIcon() {
  const [open, setOpen] = useState(false);
  const en = useLang() === "en";
  return (
    <>
      <button
        type="button"
        aria-label={en ? "About generic target curves" : "À propos des cibles génériques"}
        onClick={(event) => { event.stopPropagation(); setOpen(true); }}
        className="ml-1 inline-flex align-middle text-gray-400 transition-colors hover:!text-black"
      >
        <Info size={14} />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-lg border border-black bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label={en ? "Close" : "Fermer"}
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 text-gray-500 transition-colors hover:!text-black"
            >
              <X size={18} />
            </button>
            <BrandTargetInfoContent />
          </div>
        </div>
      )}
    </>
  );
}
