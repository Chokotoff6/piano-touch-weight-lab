import { useState } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { useLang } from "@/data/translations";

export type TargetVariant = "standard" | "brand";

/** Contenu bilingue partagé (overlay graphiques et bas de page d'accueil). */
export function BrandTargetInfoContent({ variant = "brand" }: { variant?: TargetVariant }) {
  const en = useLang() === "en";
  if (variant === "standard") {
    return (
      <div className="text-sm leading-relaxed text-foreground">
        <h3 className="mb-3 text-base font-bold uppercase">
          {en ? "About Generic Target Curves" : "À propos des courbes Cibles Génériques"}
        </h3>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-semibold">{en ? "Reference Benchmarks:" : "Valeurs de Référence :"}</span>{" "}
            {en
              ? "These theoretical dataset values represent standard industry guidelines for optimal key downweight and action friction."
              : "Ces données théoriques représentent les standards de laboratoire et de facture généralement constatés dans l'industrie pour un confort de jeu optimal (poids d'abaissement linéaire et friction cible)."}
          </li>
          <li>
            <span className="font-semibold">{en ? "Generic Nature:" : "Nature Générique :"}</span>{" "}
            {en
              ? "This curve is purely benchmark-driven, universal, and generic. It does not map to any specific commercial brand, piano model, or production year."
              : "Cette courbe est purement indicative, universelle et générique. Elle ne correspond à aucun modèle précis, aucune marque commerciale, ni aucune année de fabrication spécifique."}
          </li>
        </ul>
      </div>
    );
  }
  return (
    <div className="text-sm leading-relaxed text-foreground">
      <h3 className="mb-3 text-base font-bold uppercase">
        {en ? "About Generic Brand Target Curves" : "À propos des courbes Cibles Génériques de marques"}
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

export const TARGET_LEGAL_TITLE = "À propos des Courbes de Référence Indicatives de marques";

export const TARGET_LEGAL_PARAGRAPHS = [
  "Données Indicatives : Ces valeurs de référence sont fournies à titre purement indicatif et informatif. Elles proviennent de compilations professionnelles indépendantes, de documentations techniques publiques et de constatations d'ateliers. Elles représentent des données courantes pour la marque sélectionnée et ne constituent pas une spécification contractuelle d'usine.",
  "Propriété Intellectuelle & Indépendance : Cette application est un outil totalement indépendant d'aide au diagnostic. Les marques mentionnées (Yamaha, Kawai, Steinway & Sons, etc.) sont la propriété exclusive de leurs titulaires respectifs. Ce service n'est ni affilié, ni agréé, ni soutenu officiellement par ces constructeurs.",
  "CGU & Responsabilité de l'Artisan : En utilisant ces profils, vous acceptez nos CGU et notre politique de confidentialité (RGPD). L'artisan professionnel reste le seul maître d'œuvre, expert et unique responsable des réglages mécaniques et des interventions physiques effectués sur l'instrument.",
];

export const TARGET_LEGAL_TEXT = [TARGET_LEGAL_TITLE, ...TARGET_LEGAL_PARAGRAPHS].join("\n\n");

/** Petit "i" noir net, affiché à côté de « Cible » : tooltip légal au survol
    et bascule au clic (pour le tactile). */
export function TargetLegalInfoIcon() {
  const [pinned, setPinned] = useState(false);
  return (
    <span
      className="group relative inline-flex items-center align-middle"
      onMouseLeave={() => setPinned(false)}
    >
      <button
        type="button"
        aria-label="Avertissement sur les données cibles"
        onClick={(event) => {
          event.stopPropagation();
          setPinned((v) => !v);
        }}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-black text-[10px] font-bold !text-black"
      >
        i
      </button>
      <span
        className={`absolute left-5 top-1/2 w-[420px] -translate-y-1/2 rounded-md border border-gray-300 px-3 py-2 text-left text-[12.5px] font-medium normal-case leading-snug text-gray-950 shadow-lg group-hover:block ${pinned ? "block" : "hidden"}`}
        style={{ zIndex: 99999, backgroundColor: "#ffffff" }}
      >
        <span className="mb-1 block font-bold">{TARGET_LEGAL_TITLE}</span>
        {TARGET_LEGAL_PARAGRAPHS.map((paragraph) => (
          <span key={paragraph} className="mb-1 block last:mb-0">
            {paragraph}
          </span>
        ))}
      </span>
    </span>
  );
}


/** Petite icône "i" verte ouvrant l'overlay d'information juridique. */
export function BrandTargetInfoIcon({ variant = "brand" }: { variant?: TargetVariant }) {
  const [open, setOpen] = useState(false);
  const en = useLang() === "en";
  const overlay = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
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
        <BrandTargetInfoContent variant={variant} />
      </div>
    </div>
  );
  return (
    <>
      <button
        type="button"
        aria-label={en ? "About generic target curves" : "À propos des cibles génériques"}
        onClick={(event) => { event.stopPropagation(); setOpen(true); }}
        className="ml-1 inline-flex translate-y-[-2px] align-middle"
        style={{ color: "#10b981" }}
      >
        <Info size={14} color="#10b981" />
      </button>
      {open && typeof document !== "undefined" ? createPortal(overlay, document.body) : null}
    </>
  );
}

