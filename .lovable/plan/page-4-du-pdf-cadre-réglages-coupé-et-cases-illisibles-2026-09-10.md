# Page 4 du PDF : cadre « Réglages » coupé et cases illisibles

## Ce que montre la page 4

Le cadre de gauche s'arrête net : sa bordure noire du bas manque et les dernières lignes (« 1/48 PIANOS… SUR LE CLOUD ») touchent le bord. Les cases à cocher des trois options (« Même zone climatique », « Même année de fabrication », « Pianos de moins de 5 ans ») n'apparaissent plus que comme un petit crochet.

## Analyse : d'où vient le problème

### 1. La hauteur du cadre est figée sur celle du cadre « Moyennes »

Dans `src/routes/comparer.tsx`, le conteneur du panneau Réglages reçoit une hauteur en pixels imposée, recopiée de la hauteur du cadre Moyennes :

```tsx
<div ref={settingsRef} data-pdf-expand className="sticky top-[127px] … flex flex-col overflow-visible"
     style={averagesHeight > 0 ? { height: `${averagesHeight - 8}px` } : undefined}>
```

Le panneau lui-même est `flex flex-1 flex-col` avec un enfant `h-full` : quand CLOUD est allumé, six éléments supplémentaires s'ajoutent et débordent hors de cette hauteur figée.

### 2. La photo est mesurée avant d'être « libérée »

Dans `src/lib/pdf-report.ts`, la hauteur de capture est calculée sur l'élément visible :

```ts
const naturalH = expand ? Math.max(el.scrollHeight, el.offsetHeight) : el.offsetHeight;
```

Les règles qui libèrent la hauteur (`height: auto !important`, `overflow: visible`) ne sont appliquées qu'ensuite, dans la copie. Et comme le débordement est en `overflow: visible`, `scrollHeight` reste égal à la hauteur figée : la photo est donc découpée à la hauteur tronquée, bordure du bas comprise.

### 3. Les cases sont écrasées par le gabarit des pastilles

Toutes les lignes utilisent le même gabarit :

```
h-[31px] min-h-[31px] max-h-[31px] … px-1.5 text-[0.68rem] whitespace-nowrap
```

Hauteur verrouillée à 31 px, texte sur une seule ligne interdite de retour, et libellés longs en majuscules dans une colonne étroite : le carré de 18 px placé après le texte est poussé hors de la pastille et se retrouve rogné — d'où le crochet.

## Ce que je propose de corriger

1. **Libérer la hauteur du cadre Réglages** : supprimer la hauteur en pixels recopiée de Moyennes ; le cadre prend sa hauteur réelle, à l'écran comme au PDF.
2. **Mesurer après libération** : dans le script d'export, calculer la hauteur de capture sur le contenu réellement déployé (hauteur cumulée des enfants) plutôt que sur la boîte figée, pour que la bordure du bas entre toujours dans l'image.
3. **Réécrire les trois options en liste verticale aérée** : une colonne `flex flex-col gap-2`, chaque ligne en hauteur automatique (`min-h-[34px]`, plus de `max-h`), texte à gauche autorisé à passer sur deux lignes (`whitespace-normal leading-snug`), case à droite en `shrink-0` avec `justify-between`. Même traitement pour les deux lignes « Usage instrument » et « Modifications importantes ».
4. **Vérification** : générer l'export, contrôler la page 4 en image et confirmer bordure basse complète et cases nettes.

## Détails techniques

- `src/routes/comparer.tsx` : retirer le `style={{ height: averagesHeight - 8 }}` du wrapper `settingsRef` (et le `h-full` interne devenu inutile) ; revoir `PILL_BASE`/`cycleRow` pour les lignes de filtres.
- `src/lib/pdf-report.ts` : dans `capture()`, pour `[data-pdf-expand]`, dériver la hauteur du dernier enfant (`lastChild.getBoundingClientRect().bottom - el.getBoundingClientRect().top`) au lieu de `scrollHeight`.
- Aucun changement sur `drawRow()` : chaque cadre garde déjà sa hauteur naturelle et reste centré verticalement.
