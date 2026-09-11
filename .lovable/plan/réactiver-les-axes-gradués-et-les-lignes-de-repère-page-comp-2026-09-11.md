# Réactiver les axes gradués et les lignes de repère (page Comparer)

## Ce que j'ai trouvé

Les 4 graphiques de Comparer et ceux de Résultats utilisent le **même** composant (`ComparisonChart` dans `src/routes/comparer.tsx`). Une seule option, `autoDomain`, sépare les deux rendus :

- Résultats (`src/routes/resultats.tsx`, ligne 336) passe `autoDomain` → axe vertical gradué (44 px, graduations entières) **et** lignes de repère horizontales.
- Comparer (ligne 1884) ne le passe pas → branche de repli :
  `<YAxis width={0} tick={false} axisLine={false} tickLine={false} domain={family.domain} />`
  soit un axe de largeur zéro, sans trait ni chiffres.

Les deux manques ont donc **une seule et même cause**. Les lignes horizontales sont rendues par le bloc conditionnel `autoDomain && yTicks && yTicks.length > 2` : sans `autoDomain`, `yDomain` reste `undefined`, donc `yTicks` aussi, donc le composant `HorizontalGuides` n'est jamais monté. L'axe et la grille tombent ensemble parce qu'ils partagent la même liste de graduations.

Ce n'est ni une marge cassée ni un composant supprimé : `autoDomain` sert aujourd'hui à deux choses à la fois — le calcul automatique de l'échelle **et** l'affichage axe + grille. Le miroir caché de l'export PDF (ligne 1846) passe bien `autoDomain`, ce qui explique que ces repères soient visibles dans le PDF mais pas à l'écran.

## Ce que je propose

Séparer les deux responsabilités, sans toucher au domaine par famille propre à Comparer :

1. Extraire le calcul des graduations entières (aujourd'hui interne à la branche `autoDomain`) en petite fonction réutilisable, appliquée soit à `yDomain`, soit à `family.domain` sur Comparer.
2. Rendre un axe gradué dans la branche de repli : largeur 44 px, `tickMargin` 8, `allowDecimals={false}`, `fontSize: 10`, couleur `#111827` — typographie identique à Résultats.
3. Réinjecter les lignes horizontales sur Comparer via le même composant `HorizontalGuides`, mais volontairement limitées à **3 lignes** : on retire la première et la dernière graduation (déjà portées par le cadre) et, si la famille produit plus de 3 graduations intermédiaires, on n'en garde que 3 réparties régulièrement. Trait fin gris clair `#9ca3af`, 1 px — assez discret pour des cadres de 300 px.
4. Ne pas appliquer le décalage `axisShift` sur Comparer : il est calibré pour la géométrie de Résultats (`sideMargin + 46`). Sur Comparer la marge gauche vaut déjà 140 px, l'axe de 44 px s'y loge sans modifier la marge ni la largeur du tracé — donc aucun déplacement des courbes ni des étiquettes de droite.
5. Conserver le comportement en mode zoom et en mode « N/B groupées » : l'axe reste ancré au bord gauche du tracé, le décalage de 30 px du bloc n'est pas modifié.

## Points de vigilance

- Le miroir PDF n'est pas modifié : il continue d'utiliser `autoDomain`, les exports restent identiques au pixel près.
- En mode zoom, les mêmes 3 lignes sont conservées (pas de densification), pour ne pas brouiller la lecture des courbes.
- Vérification après build : typecheck, build, puis contrôle visuel des 4 cadres en mode normal, en zoom et en « N/B groupées ».

## Détail technique

Fichier touché : `src/routes/comparer.tsx` uniquement — props de `ComparisonChart`/`FamilyChart`, branche `YAxis` de repli, extraction du calcul de graduations, et condition de montage de `HorizontalGuides` (avec sous-échantillonnage à 3 lignes hors `autoDomain`).
