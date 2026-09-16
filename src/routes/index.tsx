import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang } from "@/data/translations";
import { DemoIntro } from "@/components/DemoIntro";

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
      <div className="mx-auto mt-[116px] w-full max-w-4xl space-y-8 text-left text-sm leading-relaxed text-foreground">
        <h1 className="text-xl font-semibold leading-snug">
          {en ? (
            <>
              Welcome to KeyWeight! A collaborative and independent application
              <br />
              for pianists and piano technicians.
            </>
          ) : (
            <>
              Bienvenue sur KeyWeight ! Une application collaborative et indépendante
              <br />
              pour pianistes et techniciens de piano.
            </>
          )}
        </h1>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {en ? "Is my piano action too heavy?" : "Mon piano est-il trop dur ?"}
          </h2>
          <p>
            {en
              ? "Heavy touch, finger fatigue...? KeyWeight allows you to quickly objectify these physical sensations by measuring whether downweight, upweight, friction, and balance reveal a regulation defect."
              : "Toucher trop lourd, fatigue ou douleurs... ? KeyWeight vous permet d'objectiver rapidement si les poids de descente, de remontée, la friction et la balance de votre clavier révèlent un éventuel problème de régulation."}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold uppercase tracking-wide">
            {en ? "2 diagnostic modules" : "2 modules de diagnostic"}
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>{en ? "Optimized data entry & workshop reports:\u00a0" : "Saisie optimisée & rapports d'atelier :"}</strong>{" "}
              {en
                ? "fast measurement encoding, interactive dashboard and PDF report creation"
                : "encodage rapide des mesures, tableau de bord interactif et création de rapports PDF"}
            </li>
            <li>
              <strong>{en ? "Comparative Analysis:" : "Graphiques d'analyse comparative :"}</strong>{" "}
              {en
                  ? "\u00a0before/after regulation graphs, comparison curves with \"standard\" regulation or community data (Cloud)"
                 : "\u00a0graphiques avant/après régulation, courbes de comparaison avec régulation \"standard\" ou données de la communauté (Cloud)"}
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
                ? "weigh directly on the Web app, or using a simple PDF form"
                : "pesez directement sur l'appli Web, ou à l'aide d'un simple formulaire PDF"}
            </li>
            <li>
              <strong>{en ? "CSV and PDF Reports:" : "Rapports CSV et PDF :"}</strong>{" "}
              {en
                ? "save an instrument's history and export comparative graphical analysis reports"
                : "sauvegardez l'historique d'un instrument et exportez les rapports graphiques d'analyse comparative"}
            </li>
          </ul>
        </section>

        <p>
          {en ? (
            <>
              Any questions? Dedicated <strong>FAQ</strong>s for each module provide answers to all
              practical and technical inquiries.
            </>
          ) : (
            <>
              Une question ? Des <strong>FAQ</strong> dédiées à chaque module répondent à toutes les
              questions pratiques et techniques.
            </>
          )}
        </p>
      </div>

      <div className="mt-[124px] flex justify-center">
        <Link
          to="/saisie"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {en ? "Start your diagnosis" : "Commencer votre diagnostic"}
        </Link>
      </div>

      <DemoIntro en={en} />
    </main>
  );
}
