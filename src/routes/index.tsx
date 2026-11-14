import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang } from "@/data/translations";
import logoKwText from "@/assets/logo-kw-text.svg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KeyWeight — Outil de mesure et de diagnostic du touché de piano" },
      {
        name: "description",
        content:
          "Pesée assistée, bilan mécanique, rapports et analyses comparatives du toucher de piano, sur tablette ou ordinateur.",
      },
      { property: "og:title", content: "KeyWeight — Mesure et diagnostique du toucher de piano" },
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
          {/* Mot KEYWEIGHT teinté au mauve exact du logo via masque (compatible iOS 15). */}
          <img src={logoKwText.url} alt="" aria-hidden="true" className="invisible absolute h-12 w-auto" decoding="async" />
          <div
            role="img"
            aria-label="KeyWeight"
            className="mb-2 h-12"
            style={{
              aspectRatio: "var(--kw-text-ratio, 6.5)",
              backgroundColor: "#7149ab",
              WebkitMaskImage: `url(${logoKwText.url})`,
              maskImage: `url(${logoKwText.url})`,
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskPosition: "left center",
              maskPosition: "left center",
            }}
          />
          <h1 className="text-2xl font-semibold leading-snug !text-black">
            {en ? "Piano touch measurement and diagnostic tool" : "Outil de mesure et de diagnostic du touché de piano"}
          </h1>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold uppercase tracking-wide !text-[#4c1d95]">3 modules</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {(en
              ? [
                  ["WEIGHING", ["Assisted entry: touch keypad, automatic advance, consistency checks.", "Express C/C# mode, selective entry filters W/B - DW/UW.", "Full / Octave view. Farewell Excel spreadsheets and loose sheets!"]],
                  ["DASHBOARD", ["Interactive dashboard: curves and averages by key colour.", "Regulation history saved in a local .kw file (100% offline).", "Detailed PDF reports for quotes and certification."]],
                  ["ANALYSIS", ["Comparison: before/after regulation, Standard targets and Cloud (collaborative database).", "Diagnosis: Zoom mode with out-of-tolerance alerts and direct editing."]],
                ]
              : [
                  ["PESÉE", ["Adieu tableurs Excel et feuilles volantes !", "Saisie assistée : pavé tactile, avance automatique, contrôles de cohérence.", "Mode rapide Do/Do#, filtres d'affichage sélectif N/B - PD/PR.", "Vue Complète / Octave."]],
                  ["BILAN", ["Tableau de bord interactif : poids & courbes (PD-PR-Friction et PB).", "Import/export de fiche d'instrument.", "Rapports PDF détaillés pour devis et certification."]],
                  ["ANALYSE", ["Comparaison courbes avant/après régulation (Points d'historique, Cibles standards d'usine, données Cloud).", "Diagnostic fin : touches hors tolérance, mode Zoom note à note avec retouche directe.", "Profil et points d'historique d'instrument archivés dans fichier .kw local (100 % hors ligne)."]],
                ]
            ).map(([title, items]) => (
              <fieldset key={title as string} className="min-w-0 rounded-lg border border-gray-300 bg-neutral-500/20 backdrop-blur-sm px-4 pb-4 pt-1">
                <legend className="px-2 text-lg font-extrabold !text-[#7149ab]">{title as string}</legend>
                <ul className="list-disc space-y-1 pl-5 marker:font-normal">
                  {(items as string[]).map((t) => <li key={t}><span className="font-medium !text-black">{t}</span></li>)}
                </ul>
              </fieldset>
            ))}
          </div>
        </section>

        <section className="space-y-1">
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
      <div className="mt-4 w-full text-center">
        <Link to="/saisie" search={{ demo: "true" }} title={en ? "Fictional piano profile: test every feature without touching your real data." : "Profil de piano fictif : testez toutes les fonctions sans toucher à vos données réelles."} className="block font-bold !text-[#4c1d95] hover:underline">
          {en
            ? 'Test the application in "Demo Mode" with a fictional piano profile.'
            : 'Tester l\'application en "Mode Demo" avec un profil de piano fictif.'}
        </Link>
      </div>
    </main>
  );
}
