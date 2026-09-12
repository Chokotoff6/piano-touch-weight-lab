# Diagnostic du logo jaune de soutien

## Vérité technique

Oui, le logo est artificiellement rogné par le code actuel.

Dans `src/routes/__root.tsx` :

- Le bouton parent est bloqué à `width: 85px` et `height: 40px`.
- Ce même bouton porte `overflow-hidden`, donc tout ce qui dépasse de cette fenêtre est coupé.
- L’image est forcée en carré à `width: 111.44px` et `height: 111.44px`, même si le PNG d’origine est plus large que haut.
- L’image est ensuite décalée avec `left: -11.71px` et `top: -36.37px`, ce qui place volontairement une grande partie hors du cadre.
- La classe `object-contain` ne peut pas corriger cela, car elle agit à l’intérieur de la boîte carrée déjà imposée à l’image.
- Le composant `Button` ajoute aussi `rounded-md`; combiné à `overflow-hidden`, il peut arrondir/couper les coins extérieurs du visuel.

## Cause exacte

Le code n’affiche pas le PNG dans ses proportions natives. Il affiche seulement une fenêtre fixe de 85 × 40 px sur une image artificiellement agrandie en 111,44 × 111,44 px et déplacée hors champ. Les côtés gauche et droit sont donc nécessairement rognés dès l’état initial, avant même l’animation de respiration.

## Correction prévue

1. Conserver la hauteur visuelle historique de 40 px.
2. Laisser le navigateur calculer automatiquement la largeur depuis les proportions réelles du PNG (`height: 40px; width: auto; max-width: none`).
3. Dimensionner le bouton selon cette largeur réelle au lieu du blocage fixe à 85 px.
4. Supprimer le masquage artificiel (`overflow-hidden`) et neutraliser l’arrondi hérité sur ce seul bouton.
5. Supprimer les décalages négatifs `left/top` devenus inutiles.
6. Conserver strictement la position verticale actuelle, le fondu de 2 s après 5 s, l’animation de respiration centrée et les nouvelles sources FR/EN.

## Vérification

Après approbation : sauvegarde, modification ciblée, puis build et contrôle visuel du logo complet sans rognage latéral.
