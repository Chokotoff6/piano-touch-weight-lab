# Aligner exactement les graphiques Comparer sur la mécanique de Résultats

## Verdict historique

**Non : le modèle géométrique complet de Résultats n’a jamais été appliqué aux quatre graphiques visibles de Comparer.**

- Dès les sauvegardes du 6 septembre, Comparer utilisait un axe volontairement invisible : `width={0}`, sans graduations, sans trait et sans lignes horizontales.
- Le 8 septembre, la mécanique rigoureuse a été ajoutée dans le composant partagé, mais uniquement dans la branche `autoDomain` : domaine calculé sur les données, graduations entières régulières, marge gauche augmentée, axe translaté vers la gauche et repères horizontaux associés.
- Résultats et le miroir PDF activaient cette branche avec `autoDomain`. La page Comparer visible continuait d’utiliser l’autre branche, avec ses domaines fixes par famille et son axe masqué.
- La dernière correction a réaffiché un axe dans cette ancienne branche, sans lui appliquer la géométrie de Résultats. Elle a également ajouté un sous-échantillonnage indépendant limité à trois repères. Ce n’est donc pas un ancien miroir qui aurait sauté : c’est une imitation partielle ajoutée récemment.

## Cause exacte des deux anomalies actuelles

### Axe trop à droite

Comparer conserve une marge gauche de 140 px pour les noms de courbes. Son nouvel axe de 44 px reste à la position naturelle de cette marge, sans le décalage horizontal utilisé sur Résultats. Il se retrouve donc près du début du tracé et de la touche 4, au lieu d’être replacé dans l’espace libre à gauche.

Résultats applique au contraire les trois éléments ensemble :

1. une marge gauche étendue ;
2. un décalage calculé de l’axe, de ses chiffres et de ses graduations ;
3. un domaine horizontal commençant avant la touche 1 pour préserver l’espace entre l’axe, les libellés et les courbes.

### Repères horizontaux irréguliers

La correction récente calcule d’abord des graduations régulières, puis en prélève artificiellement trois par indices arrondis. Par exemple, une série régulière `61, 67, 73, 79` devient `61, 73, 79` : les écarts visuels passent de 6 à 12 puis 6 grammes. Les lignes restent calées sur leurs chiffres, mais leur répartition n’est plus régulière.

Résultats ne fait pas ce prélèvement : son axe et ses repères proviennent de la même série de graduations régulières calculée sur le domaine réel majoré de 10 %.

## Correction proposée

1. Créer d’abord un point d’historique complet de `src/routes/comparer.tsx`.
2. Supprimer la mécanique spéciale ajoutée uniquement pour Comparer : `familyTicks`, prélèvement arrondi de trois lignes et axe non décalé.
3. Faire passer les quatre graphiques visibles de Comparer par la même mécanique que Résultats :
   - domaine vertical calculé sur toutes les courbes actives du mode groupé ;
   - marge de sécurité à gauche ;
   - axe de 44 px translaté avec le même calcul géométrique ;
   - domaine horizontal étendu avant la touche 1 ;
   - mêmes graduations entières régulières pour l’axe et les repères.
4. Produire exactement trois repères intérieurs **sans sous-échantillonner des graduations existantes** : calculer directement quatre intervalles égaux sur le domaine arrondi, puis utiliser les trois valeurs intérieures pour l’axe et les lignes. Les chiffres et les lignes partageront donc strictement les mêmes positions.
5. Conserver les grandes marges nécessaires aux noms de courbes et appliquer le même décalage à l’axe, aux chiffres, aux petites graduations et au départ des lignes horizontales afin qu’aucun élément ne se chevauche.
6. Ne modifier ni les données, ni les couleurs, ni les interactions souris/clavier, ni l’export PDF.
7. Vérifier les quatre cadres en vue normale et en zoom, dans les modes groupé et séparé, puis valider le build.

## Détail technique

Le changement reste limité à `src/routes/comparer.tsx`. La source de vérité sera un seul calcul commun de domaine, de trois graduations intérieures et de géométrie horizontale, utilisé par Résultats et Comparer au lieu de deux branches divergentes.