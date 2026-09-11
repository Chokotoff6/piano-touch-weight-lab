import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/politique-confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité (RGPD) — Piano Touch Weight Lab" },
      { name: "description", content: "Politique de confidentialité et traitement des données personnelles conforme au RGPD." },
      { property: "og:title", content: "Politique de confidentialité (RGPD) — Piano Touch Weight Lab" },
      { property: "og:description", content: "Politique de confidentialité et traitement des données personnelles conforme au RGPD." },
    ],
    links: [{ rel: "canonical", href: "https://piano-touch-weight-lab.lovable.app/politique-confidentialite" }],
  }),
  component: ConfidentialitePage,
});

function ConfidentialitePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-foreground">
      <Link to="/" className="text-sm text-blue-700 hover:underline">← Retour à la saisie</Link>
      <h1 className="mt-4 text-2xl font-bold">Politique de confidentialité (RGPD)</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : septembre 2026</p>

      <section className="mt-6 space-y-4 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">1. Responsable du traitement</h2>
        <p>
          Le responsable du traitement des données est l'éditeur du site Piano Touch Weight Lab,
          outil expérimental collaboratif mis à disposition gratuitement. Pour toute question
          relative à vos données, contactez l'éditeur via le formulaire de contact du site.
        </p>

        <h2 className="text-lg font-semibold">2. Données traitées</h2>
        <p>
          Le site traite les données saisies par l'artisan dans le cadre de la mesure des poids de
          touches d'un piano : marque, modèle, année, numéro de série, et valeurs de pesées
          (poids descendant, poids remontant). Les données d'identification du piano (numéro de
          série notamment) sont conservées pour permettre un accès préférentiel aux
          fonctionnalités de base.
        </p>

        <h2 className="text-lg font-semibold">3. Finalités</h2>
        <p>
          Les données sont collectées uniquement pour l'aide au diagnostic et au réglage des
          poids de touches, ainsi que pour la comparaison avec des données de référence
          indicatives. Aucune donnée n'est utilisée à des fins de prospection commerciale.
        </p>

        <h2 className="text-lg font-semibold">4. Base légale</h2>
        <p>
          Le traitement repose sur le consentement de l'utilisateur (art. 6.1.a du RGPD),
          matérialisé par l'acceptation du bandeau de consentement lors de l'utilisation du
          service.
        </p>

        <h2 className="text-lg font-semibold">5. Durée de conservation</h2>
        <p>
          Les données de saisie sont conservées le temps de la session de travail et de
          l'exportation des résultats. L'éditeur se réserve le droit de supprimer l'historique
          des saisies à tout moment, sans préavis ni indemnité.
        </p>

        <h2 className="text-lg font-semibold">6. Vos droits</h2>
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement,
          de limitation, d'opposition et de portabilité de vos données. Pour exercer ces droits,
          contactez l'éditeur via le formulaire de contact du site.
        </p>

        <h2 className="text-lg font-semibold">7. Caractère indicatif des données de référence</h2>
        <p>
          Les données de régulation cibles fournies le sont à titre purement indicatif, de
          recherche et d'aide au diagnostic indépendant, sans affiliation officielle avec les
          constructeurs cités. L'artisan reste le seul maître d'œuvre et responsable des
          réglages mécaniques effectués.
        </p>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Ce document est fourni à titre indicatif et doit être adapté par l'éditeur selon son
        régime juridique exact.
      </p>
    </main>
  );
}
