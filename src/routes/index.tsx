import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang } from "@/data/translations";
import logoKwText from "@/assets/logo-kw-text.svg.asset.json";

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


function Accueil() {
  const lang = useLang();
  const en = lang === "en";

  return (
    <main className="relative mx-auto flex max-w-[1400px] flex-col px-6 pb-6 pt-2">
      <div className="mx-auto mt-[66px] w-full max-w-4xl space-y-8 text-left text-sm leading-relaxed !text-black">
        <header className="space-y-1">
          <img
            src={logoKwText.url}
            alt="KeyWeight"
            className="mb-6 h-12 w-auto"
            decoding="async"
          />
          <h1 className="text-2xl font-semibold leading-snug !text-[#4c1d95]">
            {en ? "Precision diagnosis for keyboard touch" : "Diagnostic de précision pour le toucher de clavier"}
          </h1>
          <p className="text-base !text-black">
            {en
              ? "Collaborative and independent application for pianists and technicians"
              : "Application collaborative et indépendante pour pianistes et techniciens"}
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {en ? "Is your keyboard too heavy or tiring?" : "Votre clavier est-il trop dur ou fatiguant ?"}
          </h2>
          <p>
            {en
              ? "Heavy touch, muscle fatigue, poor repetition when playing...? KeyWeight lets you quickly objectify whether the downweight, upweight, friction and balance of your keyboard reveal a possible regulation problem."
              : "Toucher lourd, fatigue musculaire, manque de répétition au jeu... ? KeyWeight permet d'objectiver rapidement si les poids de descente, de remontée, la friction et la balance de votre clavier révèlent un éventuel problème de régulation."}
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold uppercase tracking-wide !text-[#4c1d95]">
            {en ? "3 modules" : "3 modules"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {(en
              ? [
                  ["DATA ENTRY", "INTERACTIVE INTERFACE", "Fast measurement encoding via the online graphic keyboard, or from a PDF form."],
                  ["RESULTS", "INTERACTIVE DASHBOARD", "Immediate visualization of the action: dynamic figures & graphs. Instant generation of a complete workshop report (PDF)."],
                  ["COMPARE", "COMPARATIVE ANALYSIS", "“Before/after” regulation graphs, comparison with standard factory targets and with community data (Cloud)."],
                ]
              : [
                  ["SAISIE", "INTERFACE INTERACTIVE", "Encodage rapide des mesures via clavier graphique en ligne, ou depuis formulaire PDF."],
                  ["RESULTATS", "TABLEAU DE BORD INTERACTIF", "Visualisation immédiate de la mécanique : chiffres & graphiques dynamiques. Génération instantanée d’un Rapport d'atelier complet (PDF)."],
                  ["COMPARER", "ANALYSE COMPARATIVE", "Graphiques « avant/après » régulation, confrontation aux cibles d’usine standards et comparaison avec les données de la communauté (Cloud)."],
                ]
            ).map(([title, sub, text]) => (
              <div key={title} className="space-y-1 rounded-lg border border-gray-300 bg-white/80 p-4">
                <h3 className="text-base font-bold !text-[#4c1d95]">{title}</h3>
                <p className="text-xs font-semibold uppercase tracking-wide !text-black">{sub}</p>
                <p className="!text-black">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-1">
          <p className="pb-3 !text-[#4c1d95]">
            {en
              ? 'Test the application in "Demo Mode" with a fictional piano profile.'
              : 'Tester l\'application en "Mode Demo" avec un profil de piano fictif.'}
          </p>
          <h2 className="text-base font-semibold">{en ? "Any questions?" : "Une question ?"}</h2>
          <p>
            {en
              ? "Dedicated FAQs for each module answer all your questions."
              : "Des FAQ dédiées à chaque module répondent à toutes vos interrogations."}
          </p>
          <p>
            {en
              ? "A demo video shows how to precisely measure the weight of your keyboard."
              : "Une vidéo de démo montre comment mesurer précisément le poids de votre clavier."}
          </p>
        </section>
      </div>

      <div className="mt-[24px] flex justify-center">
        <Link
          to="/saisie"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {en ? "Start your diagnosis" : "Commencer votre diagnostic"}
        </Link>
      </div>
    </main>
  );
}
