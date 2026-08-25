import { createFileRoute } from "@tanstack/react-router";

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
      <h1 className="text-xl font-semibold">Accueil</h1>
    </main>
  );
}
