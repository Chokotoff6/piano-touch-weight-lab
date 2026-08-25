import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Accueil — Touchweight statique piano" },
      {
        name: "description",
        content:
          "Outil collaboratif d'évaluation du touchweight statique pour piano : saisie des mesures et analyse des résultats.",
      },
      { property: "og:title", content: "Accueil — Touchweight statique piano" },
      {
        property: "og:description",
        content:
          "Outil collaboratif d'évaluation du touchweight statique pour piano.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Accueil,
});

function Accueil() {
  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <h1 className="max-w-3xl text-xl font-semibold leading-snug">
        "Le touché de mon piano est-il trop dur ?" Outil de diagnostic du
        poids statique d'un clavier
      </h1>

      <div className="mt-6 max-w-3xl space-y-4 text-sm leading-relaxed text-foreground">
        <p>
          Bienvenue sur ce site collaboratif indépendant proposant un outil de
          mesure à disposition des pianistes et techniciens. L'objectif de
          l'outil est double: capter les données statiques d'un clavier à un
          moment "T" et, surtout, être en mesure de comparer celles-ci avec
          d'autres instruments du même modèle.
        </p>

        <p>
          Sur base des valeurs de poids ascendant(Wd) et descendant(Wa)
          relevées, l'outil calcule la friction et la balance mécanique de
          chaque touche, ainsi que la valeur moyenne de ces différentes données
          pour l'ensemble du clavier, par couleur de touche (blanches/noires). Un
          interface graphique présente également les résultats sous forme de
          courbes, permettant une analyse fine de l'équilibre général du
          clavier, ainsi qu'une comparaison avec d'autres instruments (si
          encodés par d'autres utilisateurs). Une courbe de référence
          correspondant aux moyennes "standard" généralement suggérées est
          également disponible. Celle-ci ne constitue cependant aucune
          référence universelle, chaque fabriquant/modèle ayant ses propres
          spécifications (souvent non-communiquées).
        </p>

        <p>
          L'outil permet également de suivre l'évolution d'un instrument au fil
          du temps: les résultats peuvent être sauvés localement (et rechargés)
          sous forme de fichier CSV, ou d'un rapport PDF imprimable.
        </p>

        <p>
          Des informations sur la manière de prélever ces données correctement
          sont disponibles sur :{" "}
          <a href="#" className="underline hover:text-primary">
            XXXX
          </a>{" "}
          (utilisez des liens hypertextes factices cliquables pour le moment).
          Des kits de "poids" calibrés sont disponibles sur :{" "}
          <a href="#" className="underline hover:text-primary">
            liens
          </a>
          .
        </p>

        <p>
          NB. Le "poids de toucher" global ressenti par le pianiste est une
          sensation "dynamique" : la géométrie de la mécanique, la friction
          des feutres et l'inertie des marteaux comptent tout autant que le
          simple poids de pesée "statique" mesurés ici. Plus d'informations :{" "}
          <a
            href="https://stanwoodpiano.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            stanwoodpiano.com
          </a>
          .
        </p>
      </div>

      <div className="mt-8">
        <Link
          to="/saisie"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Start your diagnosis
        </Link>
      </div>
    </main>
  );
}
