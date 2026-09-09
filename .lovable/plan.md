# Diagnostic : pourquoi la sauvegarde PDF est passée de 1 s à 7 s

## Ce que révèle la comparaison avec les versions rapides

Les versions rapides (sauvegardes du 8 septembre, jusqu'à `20260909-055100`) faisaient **deux choses** que la version actuelle ne fait plus :

1. **Les images du rapport étaient préparées à l'avance, en arrière-plan.** Dès que les mesures étaient complètes, les 5 images (le grand tableau + les 4 graphiques) étaient fabriquées discrètement pendant que l'artisan travaillait, puis gardées en mémoire pour la session. Au clic sur Sauver, il ne restait qu'à assembler le document : d'où l'impression d'instantanéité.
2. Au clic, le code lisait d'abord cette réserve d'images (`getCachedCaptures`) et ne refabriquait rien si elle était valide.

La consigne « la capture ne doit se faire qu'une seule fois, au clic sur Sauver » (appliquée dans la sauvegarde `20260909-055100`) a supprimé la préparation en arrière-plan **et** l'utilisation de la réserve. Depuis, les 5 images sont fabriquées entièrement au moment du clic — c'est exactement le budget de 7 secondes constaté. Ce n'est donc ni une option de `html2canvas`, ni la pile Annuler/Rétablir : le travail lourd a simplement été déplacé du temps d'attente naturel vers le clic.

Deux facteurs aggravants, mineurs à côté du précédent :
- les 4 graphiques sont fabriqués en pleine définition alors qu'ils sont ensuite réduits dans la page ;
- chaque image est fabriquée l'une après l'autre, jamais en parallèle.

## Pourquoi « Export en cours... » n'apparaît plus

Le message est bien déclenché (`setIsExporting(true)`), mais la fabrication des images démarre dans la même fraction de seconde et bloque complètement l'affichage : le navigateur n'a jamais l'occasion de dessiner le message avant d'être saturé. Il apparaît donc « après coup », c'est-à-dire jamais visiblement. Il manque une vraie respiration (un court délai réel) entre l'affichage du message et le début du travail lourd.

## Comment revenir à 1 seconde sans toucher à la mise en page

Rien à changer dans les styles ni dans la géométrie du grand tableau : tout se joue sur le *moment* du travail.

1. **Rétablir la préparation en arrière-plan + la réserve d'images**, comme dans les versions rapides : dès que la saisie est conforme et stable, fabriquer les images sans bloquer, les ranger sous une clé qui dépend des mesures et de la fiche piano. Au clic sur Sauver, si la réserve correspond, assembler et télécharger directement (moins d'une seconde). Si elle ne correspond pas (valeur modifiée entre-temps), refabriquer uniquement ce qui manque.
2. **Laisser respirer l'affichage** avant de lancer la fabrication, pour que « Export en cours... » soit réellement visible dans le cas où une refabrication est nécessaire.
3. **Optionnel, si l'on veut aussi accélérer le pire cas** : fabriquer les 4 graphiques en définition légèrement réduite (ils sont de toute façon réduits dans la page) et les traiter en parallèle plutôt qu'un par un.

## Détails techniques

- `src/routes/saisie.tsx` : réintroduire l'effet de pré-fabrication (`captureReportPages(collectPdfPages())` en tâche de fond, garde-fou `if (getCachedCaptures(key)) return;`), la clé de cache dérivée de `rows` + `info`, et la lecture du cache en tête de `exportPdfFile()` avant tout appel à `captureReportPages`.
- `src/lib/pdf-report.ts` : `getCachedCaptures` / `setCachedCaptures` existent déjà et sont fonctionnels (mémoire module + `sessionStorage`) — plus rien à écrire côté cache. Ajouter un `settle(60)` en tête de `captureReportPages` pour laisser peindre l'indicateur ; éventuellement `scale: 1.5` pour les blocs `[data-pdf-chart]` et capture des graphiques via `Promise.all`.
- Aucune modification des sélecteurs `onclone`, du miroir 1250 px, ni des 8 rangées d'expertise : la mise en page actuelle est conservée à l'identique.

## Point de vigilance

L'attention doit rester sur l'invalidation du cache : si la clé n'intègre pas toutes les valeurs affichées (88 pesées + fiche piano), un PDF périmé pourrait être téléchargé. C'était déjà le comportement des versions rapides et il fonctionnait, mais la clé sera revérifiée à l'implémentation.
