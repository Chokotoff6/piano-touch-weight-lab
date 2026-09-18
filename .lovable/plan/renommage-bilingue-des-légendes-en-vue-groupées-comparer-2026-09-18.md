# Renommage bilingue des légendes en vue « Groupées » (Comparer)

## Contexte
Sur la page Comparer (`src/routes/comparer.tsx`), la vue « Groupées » correspond à `keyFilter === "all"`. Dans ce mode, chaque cadre graphique ne montre qu'une seule courbe par source :
- Piano actuel → `currentLinesFor(familyId, "all", currentBaseName)` retourne `name = baseName` (« Piano actuel » / « Current piano »)
- Cloud (ou Import CSV) → `comparisonLinesFor(familyId, "all", comparisonLabel, comparisonShort)` retourne `name = comparisonLabel` (« Cloud »)

Il n'existe pas de composant recharts `<Legend>`. Les « légendes » visibles sont :
1. Le label de fin de courbe (`makeEndLabel`) qui affiche `line.shortName` (ligne 950)
2. Le tooltip (`CustomTooltipContent`) qui affiche `entry.name` (ligne 466-469)

## Changement demandé
En vue Groupées uniquement (`keyFilter === "all"`), suffixer les deux courbes fusionnées :
- Piano actuel → « Piano actuel N+B » (FR) / « Current piano B+W » (EN)
- Cloud → « Cloud N+B » (FR) / « Cloud B+W » (EN)

Les vues éclatée (split/white/black) ne changent pas : elles gardent « … blanches » / « … noires ».

## Implémentation
Deux edits ciblés dans `src/routes/comparer.tsx` :

### 1. `currentLinesFor` (ligne 531)
Remplacer le retour du cas `all` par :
```ts
const groupedSuffix = getLang() === "en" ? "B+W" : "N+B";
return [{ dataKey: metric[0], name: `${baseName} ${groupedSuffix}`, shortName: `${baseName} ${groupedSuffix}`, color: "#000000", real: true }];
```

### 2. `comparisonLinesFor` (ligne 550)
Remplacer le retour du cas `all` par :
```ts
const groupedSuffix = getLang() === "en" ? "B+W" : "N+B";
return [{ dataKey: metric[0], name: `${name} ${groupedSuffix}`, shortName: `${short} ${groupedSuffix}`, color: strong }];
```

Aucun autre fichier touché. Aucun impact sur le tooltip (`entry.name` suit automatiquement), ni sur les vues éclatées, ni sur Résultats/PDF/Cloud.

## Vérification
- `bunx tsgo --noEmit`
- build OK
- Tour navigateur (Playwright) : page Comparer, bascule en vue Groupées, vérifier que les labels de fin de courbe affichent « Piano actuel N+B » et « Cloud N+B » en FR, et « Current piano B+W » / « Cloud B+W » en EN.
