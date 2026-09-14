import { useFadeClose } from "@/lib/use-fade-close";
import { createPortal } from "react-dom";

export const LEGAL_TITLE = "Mentions Légales, RGPD & Conditions d'utilisation";
export const LEGAL_TITLE_EN = "Legal Notice, GDPR & Terms of Use";

export const LEGAL_BLOCKS: Array<[string, string]> = [
  ["Édition du site :", "L'application KeyWeight est un outil collaboratif indépendant."],
  ["Hébergement :", "Le site et la base de données sont sécurisés et hébergés par Supabase."],
  [
    "Propriété intellectuelle :",
    "L'architecture de calcul et les graphiques de diagnostic de KeyWeight sont mis à disposition des professionnels et pianistes pour un usage technique d'atelier.",
  ],
  [
    "Responsabilité :",
    "L'éditeur fournit un outil de mesure et de diagnostic métrologique, mais ne saurait être tenu responsable des interventions mécaniques réalisées sur les instruments.",
  ],
  [
    "Gestion des données (RGPD) :",
    "KeyWeight collecte exclusivement les données techniques anonymes liées au piano (modèle, numéro de série, mesures). Aucune donnée nominative n'est stockée. Pour toute demande légale de retrait ou exercice de vos droits, contactez : rgpd@keyweight.app (Usage exclusif RGPD : cette adresse sert uniquement aux obligations légales. Aucun message de support ou de discussion sur le produit ne sera traité).",
  ],
  [
    "Conditions d'utilisation et clause de non-garantie — Service en l'état :",
    "Ce site est un outil expérimental collaboratif mis à disposition gratuitement. L'éditeur ne fournit aucune garantie quant à la disponibilité du service, l'exactitude des calculs ou la conservation des données. L'éditeur se réserve le droit de modifier, restreindre ou fermer l'accès, ainsi que de supprimer l'historique des saisies à tout moment, sans préavis ni indemnité. L'éditeur reste libre d'introduire des fonctionnalités payantes pour les développements futurs de l'appli, mais le module de Saisie de l'application a pour vocation de rester libre.",
  ],
];

export const LEGAL_BLOCKS_EN: Array<[string, string]> = [
  ["Site publisher:", "The KeyWeight application is an independent collaborative tool."],
  ["Hosting:", "The website and its database are secured and hosted by Supabase."],
  [
    "Intellectual property:",
    "KeyWeight's calculation architecture and diagnostic charts are made available to professionals and pianists for technical workshop use.",
  ],
  [
    "Liability:",
    "The publisher provides a measurement and metrological diagnostic tool, and cannot be held liable for any mechanical work carried out on instruments.",
  ],
  [
    "Data management (GDPR):",
    "KeyWeight collects exclusively anonymous technical data related to the piano (model, serial number, measurements). No personal data is stored. For any legal removal request or to exercise your rights, contact: rgpd@keyweight.app (GDPR use only: this address is reserved for legal obligations. No support or product discussion message will be processed).",
  ],
  [
    "Terms of use and disclaimer — Service as is:",
    "This site is an experimental collaborative tool made available free of charge. The publisher gives no warranty as to service availability, the accuracy of calculations or data retention. The publisher reserves the right to modify, restrict or close access, and to delete entry history at any time, without notice or compensation. The publisher remains free to introduce paid features for future developments of the app, but the Data Entry module is intended to remain free.",
  ],
];

/** Fenêtre flottante juridique complète (ouverture en cut, fermeture en fondu 1 s). */
export function LegalDialog({
  open,
  onClose,
  en,
  zIndex = 99999,
}: {
  open: boolean;
  onClose: () => void;
  en: boolean;
  zIndex?: number;
}) {
  const { rendered, closing, requestClose } = useFadeClose(open, onClose);
  if (!rendered || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${closing ? "ff-closing" : ""}`}
      style={{ background: "rgba(0,0,0,0.15)", zIndex }}
      onClick={requestClose}
      role="presentation"
    >
      <div
        className="relative max-h-[80vh] w-auto max-w-2xl overflow-y-auto rounded-lg border border-gray-300 py-5 pl-5 pr-9 text-left shadow-xl"
        style={{ backgroundColor: "#FFFFFF" }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          aria-label={en ? "Close" : "Fermer"}
          onClick={requestClose}
          className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-base leading-none !text-gray-500 hover:!text-gray-900"
        >
          ×
        </button>
        <p className="text-sm font-semibold leading-relaxed !text-gray-900" style={{ margin: 0 }}>
          {en ? LEGAL_TITLE_EN : LEGAL_TITLE}
        </p>
        {(en ? LEGAL_BLOCKS_EN : LEGAL_BLOCKS).map(([label, text]) => (
          <p
            key={label}
            className="text-xs leading-relaxed !text-gray-700"
            style={{ marginTop: "8px", marginBottom: 0 }}
          >
            <strong>{label}</strong> {text}
          </p>
        ))}
      </div>
    </div>,
    document.body,
  );
}
