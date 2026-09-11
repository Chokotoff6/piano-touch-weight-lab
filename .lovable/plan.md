# Réactiver les axes verticaux gradués (page Comparer)

## Ce que j'ai trouvé

Les 4 graphiques de Comparer et ceux de Résultats utilisent le **même** composant (`ComparisonChart` dans `src/routes/comparer.tsx`). La différence tient à une seule option, `autoDomain` :

- Résultats (`src/routes/resultats.tsx`, ligne 336) passe `autoDomain` → branche qui rend un axe vertical gradué (largeur 44 px, graduations entières, lignes de repère horizontales).
- Comparer (ligne 1884) ne le passe pas → branche de repli :
  `<YAxis width={0} tick={false} axisLine={false} tickLine={false} domain={family.domain} />`
  soit un axe de largeur zéro, sans trait ni chiffres. C'est exactement pourquoi les graduations en grammes ont disparu.

Ce n'est donc ni une marge cassée ni un composant manquant : l'axe existe mais il est volontairement neutralisé sur Comparer, parce que `autoDomain` sert aujourd'hui à deux choses à la fois — le calcul automatique de l'échelle **et** l'affichage de l'axe. Le miroir caché servant à l'export PDF (ligne 1846) passe bien `autoDomain`, ce qui explique que les axes soient visibles dans le PDF mais pas à l'écran.

## Ce que je propose

Séparer les deux responsabilités, sans toucher au calcul d'échelle par famille propre à Comparer :

1. Ajouter une option d'affichage d'axe (`showYAxis`) au composant, activée par défaut sur Comparer, `autoDomain` continuant d'impliquer l'axe visible sur Résultats.
2. Dans la branche non-`autoDomain`, remplacer l'axe de largeur 0 par un axe gradué :
   - largeur 44 px, `tickMargin` 8, `allowDecimals={false}` ;
   - graduations entières calculées sur `family.domain` avec la même fonction que Résultats (5 pas maximum) ;
   - même typographie et même couleur (`fontSize: 10`, `#111827`).
3. Ne pas appliquer le décalage `axisShift` sur Comparer : il est calibré pour la géométrie de Résultats (`sideMargin + 46`). Sur Comparer la marge gauche vaut déjà 140 px, l'axe de 44 px s'y loge sans modifier ni la marge ni la largeur du tracé — donc aucun risque de déplacement des courbes ou des étiquettes de droite.
4. Conserver le comportement en mode zoom et en mode « N/B groupées » : l'axe reste ancré au bord gauche du tracé, le décalage de 30 px du bloc n'est pas modifié.

## Points de vigilance

- Les lignes de repère horizontales (`HorizontalGuides`) restent réservées à Résultats/PDF pour ne pas surcharger les 4 petits cadres ; je peux les ajouter aussi si vous le souhaitez.
- Le miroir PDF n'est pas modifié : il continue d'utiliser `autoDomain`, le rendu des exports reste identique.
- Vérification après build : typecheck, build, et contrôle visuel des 4 cadres en mode normal, zoom, et « N/B groupées ».

## Détail technique

Fichiers touchés : `src/routes/comparer.tsx` uniquement (déclaration de props de `ComparisonChart`/`FamilyChart`, branche `YAxis` de repli, extraction du calcul de graduations entières en petite fonction réutilisable).
