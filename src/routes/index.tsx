import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang } from "@/data/translations";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KeyWeight — Outil de mesure et de diagnostic du toucher de piano" },
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
    <main className="relative mx-auto flex max-w-[1400px] flex-col px-6 pb-6 pt-6">
      <div className="mx-auto mt-4 w-full max-w-4xl space-y-8 text-left text-sm leading-relaxed !text-black">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold uppercase tracking-wide !text-black">3 modules</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {(en
              ? [
                  ["WEIGHING", ["Assisted entry| • touch keypad, auto-advance, consistency checks.", "Custom layout| • Octave or Full keyboard view, W/B and DW/UW filters.", "Express mode| • quick diagnosis on 15 notes (C & C#).", "100% Offline| • works anywhere, even without network."]],
                  ["DASHBOARD", ["Overview & Balance| • averages by register, friction and W/B balance.", "Touch Health Score /100| • objective index of the keyboard's mechanical condition.", "Custom PDF report| • clear, quantified document for quotes or certification.", "Local history| • full instrument follow-up kept in your .kw file."]],
                  ["WORKBENCH", ["Comparative view| • Before/After, regulation targets and collaborative Cloud.", "Zoom & Direct editing| • note-by-note inspection and correction on the curve.", "Delta Δ & Alerts| • immediate detection of out-of-tolerance keys.", ".kw File manager| • imports, exports and transfers of your .kw files."]],
                ]
              : [
                  ["PESÉE", ["Saisie assistée| : pavé tactile, avance automatique, contrôles de cohérence.", "Ergonomie| : vue Octave ou Clavier complet, filtres N/B et PD/PR.", "Mode Rapide| : diagnostic express 15 touches (Do & Do#).", "100% Hors-ligne| : opérationnel partout, même sans réseau."]],
                  ["BILAN", ["Synthèse globale| : moyennes par registres, frottements et équilibre B/N.", "Score de Santé /100| : indice objectif de l’état mécanique du clavier.", "Rapport PDF à la carte| : document clair et chiffré pour devis ou certification.", "Historique local| : suivi complet de l’instrument conservé dans votre fichier .kw."]],
                  ["ATELIER", ["Comparaisons croisées| : Avant/Après, cibles régulation et Cloud collaboratif.", "Mode Zoom & Retouche| : inspection note à note et correction directe sur courbe.", "Écarts & Alertes (Δ)| : détection immédiate des touches hors tolérance.", "Gestion archives| : imports, exports et transferts de vos fichiers .kw."]],
                ]
            ).map(([title, items]) => (
              <fieldset key={title as string} className="min-w-0 rounded-lg border border-black bg-white/20 px-4 pb-4 pt-1">
                <legend className="px-2 text-lg font-extrabold !text-[#7149ab]">{title as string}</legend>
                <ul className="list-disc space-y-1 pl-5 marker:font-normal">
                  {(items as string[]).map((t) => <li key={t}><span className="font-medium !text-black">{t.includes("|") ? <><strong className="font-black !text-black">{t.split("|")[0]}</strong>{t.split("|")[1]}</> : t}</span></li>)}
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
