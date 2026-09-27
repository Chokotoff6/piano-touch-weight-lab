<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

Les rendus Réel, Lissé (3 points) et Lissé+ (5 points) sont calculés localement dans `ComparisonChart`, partagé par Résultats et Comparer ; garder les données brutes intactes pour permettre le cycle et le mode rapide.
Le panneau de visibilité du zoom dépend explicitement des trois sources piano actuel, Cloud et Cible standard d'usine ; une comparaison CSV ne remplace pas Cloud dans cette règle.
Les étiquettes de fin des graphiques Recharts sont placées à partir des échelles réelles par d3-force, car Recharts 2 ne propose pas de moteur natif d'évitement des chevauchements.

- Convention Stanwood dans le code : wd = Poids descendant (lourd), wa = Poids remontant ; les colonnes base historiques wa_values/wd_values sont inversées et ne sont pontées qu'à la lecture/écriture (current-piano, demo-mode) — pour ne pas migrer la base.
- La cascade démo conserve les 88 pesées séparément du brouillon animé : le mode rapide efface ce brouillon et n'y réinjecte que les Do/Do#, il ne peut donc pas servir de source au retour en mode normal.
