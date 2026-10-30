import { useFadeClose } from "@/lib/use-fade-close";
import { createPortal } from "react-dom";

export const LEGAL_TITLE = "Mentions Légales, RGPD & Conditions d'utilisation";
export const LEGAL_TITLE_EN = "Legal Notice, GDPR & Terms of Use";

export const LEGAL_BLOCKS: Array<[string, string]> = [
  ["Édition du site :", "L'application KeyWeight est un outil de diagnostic et de métrologie indépendant développé à des fins d'analyse technique d'atelier."],
  ["Hébergement & API :", "Le site internet et l'interface applicative sont hébergés de manière sécurisée sur les serveurs de production de Vercel. La base de données distante collaborative, interrogée anonymement pour les fonctionnalités de comparaison statistique, est propulsée par Supabase."],
  ["Souveraineté des données & Stockage :", "L'historique des saisies, les profils clients et les mesures techniques de régulation sont stockés de manière exclusive sur l'appareil de l'utilisateur sous la forme de fichiers physiques propriétaires .kw. L'éditeur n'héberge et ne conserve aucun historique de vos fiches pianos sur ses serveurs."],
  ["Le Miroir Cloud :", "La base de données distante Supabase sert exclusivement d'outil de comparaison communautaire anonyme. Elle reçoit uniquement les abaques techniques bruts de l'instrument afin de permettre la superposition statistique des courbes d'atelier avec les moyennes mondiales de la communauté, sans aucune logique de synchronisation ou de stockage de données personnelles."],
  ["Clause de compatibilité de marque :", "Ce logiciel est un outil de mesure tiers indépendant. Les noms de manufactures de pianos (Steinway & Sons, Yamaha, Kawai, etc.) mentionnés dans l'interface le sont exclusivement à titre de référence de compatibilité technique pour guider le travail de l'artisan. KeyWeight n'a aucune affiliation, approbation ou lien officiel avec les constructeurs cités."],
  ["Propriété intellectuelle :", "L'architecture de calcul et les graphiques de diagnostic de KeyWeight sont mis à disposition des artisans et professionnels de la facture de pianos pour un usage technique de diagnostic terrain et d'atelier."],
  ["Responsabilité :", "L'éditeur fournit un outil logiciel d'aide à la mesure et à la visualisation métrologique, mais ne saurait en aucun cas être tenu responsable des interventions mécaniques, modifications, plombages ou réparations physiques réalisés sur les instruments par les techniciens."],
  ["Gestion des données (RGPD) :", "KeyWeight collecte exclusivement les données techniques anonymes liées aux cotes physiques et abaques du piano (modèle, numéro de série, valeurs de pesée). Aucune donnée nominative n'est stockée. Pour toute demande légale de retrait ou exercice de vos droits, contactez : rgpd@keyweight.app (Usage exclusif RGPD : cette adresse sert uniquement aux obligations légales. Aucun message de support ou de discussion sur le produit ne sera traité)."],
  ["Conditions d'utilisation et clause de non-garantie — Service en l'état :", "Ce site est un outil expérimental mis à disposition des professionnels. L'éditeur ne fournit aucune garantie quant à la disponibilité du service, l'exactitude des datations historiques ou des calculs de friction, ou la conservation des données locales. L'éditeur se réserve le droit de modifier, restreindre ou fermer l'accès, ainsi que de vider l'historique des saisies communautaires à tout moment, sans préavis ni indemnité. L'éditeur reste libre d'introduire des fonctionnalités payantes pour les développements futurs de l'appli, mais le module de Saisie de l'application a pour vocation de rester libre."],
];

export const LEGAL_BLOCKS_EN: Array<[string, string]> = [
  ["Site publisher:", "The KeyWeight application is an independent diagnostic and metrology tool developed for technical workshop analysis."],
  ["Hosting & API:", "The website and application interface are securely hosted on Vercel production servers. The collaborative remote database, queried anonymously for statistical comparison features, is powered by Supabase."],
  ["Data sovereignty & Storage:", "Entry history, client profiles and technical regulation measurements are stored exclusively on the user's device as proprietary physical .kw files. The publisher does not host or keep any history of your piano records on its servers."],
  ["The Cloud mirror:", "The remote Supabase database serves exclusively as an anonymous community comparison tool. It only receives the instrument's raw technical charts to allow statistical overlay of workshop curves with the community's worldwide averages, without any synchronization logic or storage of personal data."],
  ["Brand compatibility clause:", "This software is an independent third-party measurement tool. Piano manufacturer names (Steinway & Sons, Yamaha, Kawai, etc.) mentioned in the interface are used solely as technical compatibility references to guide the technician's work. KeyWeight has no affiliation, endorsement or official link with the manufacturers cited."],
  ["Intellectual property:", "KeyWeight's calculation architecture and diagnostic charts are made available to piano craftsmen and professionals for technical field and workshop diagnostic use."],
  ["Liability:", "The publisher provides a software tool to assist measurement and metrological visualization, but can in no case be held liable for mechanical work, modifications, key leading or physical repairs carried out on instruments by technicians."],
  ["Data management (GDPR):", "KeyWeight collects exclusively anonymous technical data related to the piano's physical dimensions and charts (model, serial number, weighing values). No personal data is stored. For any legal removal request or to exercise your rights, contact: rgpd@keyweight.app (GDPR use only: this address is reserved for legal obligations. No support or product discussion message will be processed)."],
  ["Terms of use and disclaimer — Service as is:", "This site is an experimental tool made available to professionals. The publisher gives no warranty as to service availability, the accuracy of historical dating or friction calculations, or the retention of local data. The publisher reserves the right to modify, restrict or close access, and to clear community entry history at any time, without notice or compensation. The publisher remains free to introduce paid features for future developments of the app, but the Data Entry module is intended to remain free."],
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
