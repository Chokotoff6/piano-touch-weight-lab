import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/cgu")({
  head: () => ({
    meta: [
      { title: "CGU — Piano Touch Weight Lab" },
      { name: "description", content: "Conditions générales d'utilisation du service Piano Touch Weight Lab." },
      { property: "og:title", content: "CGU — Piano Touch Weight Lab" },
      { property: "og:description", content: "Conditions générales d'utilisation du service Piano Touch Weight Lab." },
    ],
    links: [{ rel: "canonical", href: "https://piano-touch-weight-lab.lovable.app/cgu" }],
  }),
  component: CguPage,
});

const LEGAL_TEXT =
  "Conditions d'utilisation et clause de non-garantie — Service en l'état : Ce site est un outil expérimental collaboratif mis à disposition gratuitement. L'éditeur ne fournit aucune garantie quant à la disponibilité du service, l'exactitude des calculs ou la conservation des données. L'éditeur se réserve le droit de modifier, restreindre ou fermer l'accès, ainsi que de supprimer l'historique des saisies à tout moment, sans préavis ni indemnité. L'éditeur reste libre d'introduire des fonctionnalités payantes. Sauf fermeture définitive du service, les numéros de série enregistrés durant la phase gratuite conserveront un accès préférentiel gratuit aux fonctionnalités de base existantes, sans que cela ne constitue un droit opposable.";

function CguPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-foreground">
      <Link to="/" className="text-sm text-blue-700 hover:underline">← Retour à la saisie</Link>
      <h1 className="mt-4 text-2xl font-bold">Conditions générales d'utilisation (CGU)</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : septembre 2026</p>

      <section className="mt-6 space-y-4 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">1. Objet</h2>
        <p>
          Les présentes conditions générales d'utilisation régissent l'utilisation du site Piano
          Touch Weight Lab, outil d'aide au diagnostic et au réglage des poids de touches de
          piano, mis à disposition gratuitement par l'éditeur.
        </p>

        <h2 className="text-lg font-semibold">2. Service en l'état</h2>
        <p>{LEGAL_TEXT}</p>

        <h2 className="text-lg font-semibold">3. Données indicatives</h2>
        <p>
          Les données de régulation cibles fournies le sont à titre purement indicatif, de
          recherche et d'aide au diagnostic indépendant, sans affiliation officielle avec les
          constructeurs cités. L'artisan reste le seul maître d'œuvre et responsable des
          réglages mécaniques et des interventions physiques effectuées sur l'instrument.
        </p>

        <h2 className="text-lg font-semibold">4. Propriété intellectuelle</h2>
        <p>
          Les compilations de données de référence, l'interface et les algorithmes de calcul
          demeurent la propriété de l'éditeur. Toute revente ou redistribution des données
          extraites du site est interdite sans autorisation.
        </p>

        <h2 className="text-lg font-semibold">5. Modification des conditions</h2>
        <p>
          L'éditeur se réserve le droit de modifier les présentes conditions à tout moment. Les
          conditions applicables sont celles en vigueur au moment de l'utilisation du service.
        </p>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Ce document est fourni à titre indicatif et doit être adapté par l'éditeur selon son
        régime juridique exact.
      </p>
    </main>
  );
}
