import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang } from "@/data/translations";
import { enableDemoMode, isDemoClicked, markDemoClicked } from "@/lib/demo-mode";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KeyWeight — Diagnostic du poids de touche du piano" },
      {
        name: "description",
        content:
          "Application collaborative pour pianistes et techniciens : saisie des poids statiques des 88 touches, friction, balance et comparaison graphique.",
      },
      { property: "og:title", content: "KeyWeight — Diagnostic du poids de touche" },
      {
        property: "og:description",
        content:
          "Objectivez le toucher de votre piano : poids de descente, remontée, friction et balance des 88 touches.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Accueil,
});

const LEGAL_TITLE = "Mentions Légales, RGPD & Conditions d'utilisation";
const LEGAL_BLOCKS: Array<[string, string]> = [
  [
    "Édition du site :",
    "L'application KeyWeight est un outil collaboratif indépendant.",
  ],
  [
    "Hébergement :",
    "Le site et la base de données sont sécurisés et hébergés par Supabase.",
  ],
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
    "Ce site est un outil expérimental collaboratif mis à disposition gratuitement. L'éditeur ne fournit aucune garantie quant à la disponibilité du service, l'exactitude des calculs ou la conservation des données. L'éditeur se réserve le droit de modifier, restreindre ou fermer l'accès, ainsi que de supprimer l'historique des saisies à tout moment, sans préavis ni indemnité. L'éditeur reste libre d'introduire des fonctionnalités payantes pour les développements futurs de l'appli, mais le cœur collaboratif du projet a pour vocation de rester libre.",
  ],
];

function Accueil() {
  const [legalOpen, setLegalOpen] = useState(false);
  const [demoVisible, setDemoVisible] = useState(false);
  const lang = useLang();
  const en = lang === "en";

  useEffect(() => {
    setDemoVisible(!isDemoClicked());
  }, []);

  const activateDemo = () => {
    enableDemoMode();
    markDemoClicked();
    setDemoVisible(false);
  };

  return (
    <main className="relative mx-auto flex max-w-[1400px] flex-col px-6 pb-6 pt-2">
      {demoVisible && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={activateDemo}
            className="whitespace-nowrap rounded-md border-2 border-black bg-black px-4 py-2 text-xs font-bold uppercase tracking-wide !text-white transition-colors hover:bg-gray-800"
          >
            {en ? "Demo mode" : "Mode démo"}
          </button>
        </div>
      )}

      <div className="mx-auto mt-4 w-full max-w-4xl space-y-8 text-left text-sm leading-relaxed text-foreground">
        <h1 className="text-xl font-semibold leading-snug">
          {en
            ? "Welcome to KeyWeight! A collaborative and independent web application tailored for pianists and piano technicians."
            : "Bienvenue sur KeyWeight ! Une application collaborative et indépendante pour pianistes et techniciens de piano."}
        </h1>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {en ? "Is my piano action too heavy?" : "Mon piano est-il trop dur ?"}
          </h2>
          <p>
            {en
              ? "Heavy touch, finger fatigue...? KeyWeight allows you to quickly objectify these physical sensations by measuring whether downweight, upweight, friction, and balance reveal a regulation defect."
              : "Toucher trop lourd, fatigue... ? KeyWeight vous permet d'objectiver rapidement si les poids de descente, de remontée, la friction et la balance de votre clavier révèlent un éventuel problème de régulation."}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold uppercase tracking-wide">
            {en ? "2 diagnostic modules" : "2 modules de diagnostic"}
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>{en ? "Data Entry & Management:" : "Saisie et gestion :"}</strong>{" "}
              {en
                ? "Fast logging and clear visualization of static touch weight data across all 88 keys"
                : "enregistrement rapide et visualisation des poids statiques des 88 touches"}
            </li>
            <li className={en ? undefined : "whitespace-nowrap"}>
              <strong>{en ? "Comparative Analysis:" : "Analyse comparative :"}</strong>{" "}
              {en
                ? "Graphical comparison against standard industry regulation targets and community crowd-sourced data (Collaborative Cloud)."
                : "comparaison graphique par rapport aux cibles usuelles et aux données de la communauté (Cloud collaboratif)."}
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold uppercase tracking-wide">
            {en ? "Workshop flexibility" : "Flexibilité"}
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li className={en ? undefined : "whitespace-nowrap"}>
              <strong>{en ? "Online or Off-line:" : "En ligne ou Off-line :"}</strong>{" "}
              {en
                ? "Take measurements directly on the web page, or on the field using a simple printable PDF weigh-out sheet, then import them later."
                : "pezez directement sur la page Web, ou sur le terrain à l'aide d'une simple fiche de pesée PDF"}
            </li>
            <li>
              <strong>{en ? "CSV and PDF Reporting:" : "Rapports CSV et PDF :"}</strong>{" "}
              {en
                ? "Save the regulation history of an instrument or export comprehensive analytical reports and charts."
                : "sauvegardez l'historique d'un instrument ou exportez les rapports graphiques et d'analyse"}
            </li>
          </ul>
        </section>

        <p>
          {en
            ? "Any questions? Dedicated FAQs for each module provide answers to all practical and technical inquiries."
            : "Une question ? Des FAQ dédiées à chaque module répondent à toutes les questions pratiques et techniques."}
        </p>
      </div>

      <div className="mt-6 flex justify-center">
        <Link
          to="/saisie"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {en ? "Start your diagnosis" : "Commencer votre diagnostic"}
        </Link>
      </div>

      <div className="mt-[120px] flex justify-center">
        <button
          type="button"
          onClick={() => setLegalOpen(true)}
          className="text-xs !text-gray-500 underline transition-colors hover:!text-gray-800"
        >
          {en ? "Legal Notice" : "Mentions Légales"}
        </button>
      </div>

      {legalOpen && (
        <div
          className="fixed inset-0 z-[99997] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.15)" }}
          onClick={() => setLegalOpen(false)}
          role="presentation"
        >
          <div
            className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-lg border border-gray-300 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={LEGAL_TITLE}
          >
            <h2 className="text-base font-semibold !text-gray-900">{LEGAL_TITLE}</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed !text-gray-800">
              {LEGAL_BLOCKS.map(([label, text]) => (
                <p key={label}>
                  <strong>{label}</strong> {text}
                </p>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium !text-gray-900 hover:bg-gray-50"
              >
                {en ? "Close" : "Fermer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
