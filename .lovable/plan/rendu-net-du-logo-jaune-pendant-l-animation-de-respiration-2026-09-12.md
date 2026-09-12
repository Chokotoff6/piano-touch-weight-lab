# Rendu net du logo jaune pendant l'animation de respiration

## Problème
Le `transform: scale()` de `.liked-breathing` active le lissage sous-pixel du
navigateur → contours baveux/flous sur le texte et la fusée.

## Solution
Ajouter trois propriétés dans la règle `.liked-breathing` existante
(`src/styles.css`, lignes 504-507) — déjà appliquée directement sur la balise
`<img>` du bouton jaune. Placer `image-rendering` dans la feuille de style (et
non en style inline React) permet de conserver les **deux** déclarations de
fallback, ce qu'un objet de style inline ne peut pas faire (clé unique).

## Bloc CSS/React exact à approuver

**Fichier : `src/styles.css`** — règle `.liked-breathing` modifiée :

```css
.liked-breathing {
  animation: liked-breathing 3.5s ease-in-out infinite;
  transform-origin: center center;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  filter: contrast(1.08);
}
```

**Aucune autre modification.** Le `<img>` dans `src/routes/__root.tsx` reste
inchangé (sa classe `liked-breathing` porte déjà ces propriétés). Aucun build
ne sera lancé tant que le bloc n'est pas approuvé.

## Note technique
`image-rendering: crisp-edges` évite le lissage bilinéaire pendant le scale ;
`-webkit-optimize-contrast` sert de fallback Safari. `filter: contrast(1.08)`
renforce les trais noirs sur le jaune. Ces propriétés s'appliquent au calque de
l'image elle-même, indépendamment du `transform` de l'animation.
