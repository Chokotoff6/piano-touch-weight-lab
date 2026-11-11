import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang } from "@/data/translations";
import logoKwText from "@/assets/logo-kw-text.svg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KeyWeight — Outil de mesure et de diagnostique du toucher de piano" },
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
          <img
            src={logoKwText.url}
            alt="KeyWeight"
            className="mb-6 h-12 w-auto"
            decoding="async"
          />
          <h1 className="text-2xl font-semibold leading-snug !text-[#4c1d95]">
            {en ? "Piano touch measurement and diagnostic tool" : "Outil de mesure et de diagnostique du toucher de piano"}
          </h1>
        </header>

        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {(en
              ? [
                  ["WEIGHING", ["Assisted weighing, action dashboard, reports and comparative analysis.", "Touch keypad, automatic advance, consistency checks; express C / C# mode.", "Farewell Excel spreadsheets and loose sheets!"]],
                  ["DASHBOARD", ["Immediate Stanwood mapping (Friction and Balance Weight).", "Spot regulation leads at a glance.", "Summaries by register (bass, mid, treble).", "Clear PDF reports for quotes and certification."]],
                  ["ANALYSIS", ["Before/after regulation curve comparison (History points, Standard factory targets, Cloud data).", "Fine diagnosis (adjustable corridor, out-of-tolerance keys, note-by-note Zoom with direct editing).", "Instrument memory (local .kw, 100% offline)."]],
                ]
              : [
                  ["PESÉE", ["Pesée assistée, bilan mécanique, rapports et analyses comparatives.", "Pavé tactile, avance automatique, contrôles de cohérence ; mode rapide Do / Do#.", "Adieu tableurs Excel et feuilles volantes !"]],
                  ["BILAN", ["Cartographie immédiate Stanwood (Friction et Poids d'équilibre).", "Déterminer en un clin d'œil les pistes de régulation.", "Synthèses par registre (basses, médiums, aigus).", "Rapports PDF clairs pour devis et certification."]],
                  ["ANALYSE", ["Comparaison des courbes avant/après régulation (Points d'historique, Cibles standards d'usine, données Cloud).", "Diagnostic fin (corridor ajustable, touches hors tolérance, mode Zoom note à note avec retouche directe).", "Mémoire de l'instrument (.kw local 100 % hors ligne)."]],
                ]
            ).map(([title, items]) => (
              <div key={title as string} className="space-y-2 rounded-lg border border-gray-300 bg-white/80 p-4">
                <h3 className="text-base font-bold !text-[#4c1d95]">{title as string}</h3>
                <ul className="list-disc space-y-1 pl-5 !text-black">
                  {(items as string[]).map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
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
        <Link to="/saisie" search={{ demo: "true" }} className="block font-bold !text-[#4c1d95] hover:underline">
          {en
            ? 'Test the application in "Demo Mode" with a fictional piano profile.'
            : 'Tester l\'application en "Mode Demo" avec un profil de piano fictif.'}
        </Link>
      </div>
    </main>
  );
}
