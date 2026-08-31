import { createFileRoute } from "@tanstack/react-router";
import { CompareFaq } from "@/components/CompareFaq";


export const Route = createFileRoute("/resultats")({
  head: () => ({
    meta: [
      { title: "Résultats — Touchweight statique piano" },
      {
        name: "description",
        content:
          "Analyse et comparaison des relevés de touchweight statique : friction, balance et moyennes par section.",
      },
      { property: "og:title", content: "Résultats — Touchweight piano" },
      {
        property: "og:description",
        content:
          "Analyse et comparaison des relevés de touchweight statique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Resultats,
});

function Resultats() {
  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <h1 className="text-xl font-semibold">Résultats</h1>
      <div className="mt-6">
        <CompareFaq />
      </div>
    </main>
  );
}


