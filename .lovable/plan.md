# Mini-panneau ON/OFF des courbes en Mode Zoom (Comparer)

## Résultat attendu
- En Mode Zoom uniquement, un mini-panneau apparaît en bas à gauche à l'intérieur du cadre du graphique, à côté du bouton de cycle centré.
- Il liste les 3 courbes avec leur libellé réel, coloré comme leur ligne :
  - « Piano actuel » / « Piano actuel N+B » (FR) ou équivalents EN → texte noir
  - « Cloud » / « Cloud N+B » (ou « Import CSV ») → texte orange (bleu si import CSV)
  - Cible (libellé actuel `targetLabel`) → texte vert
- Chaque libellé est un bouton poussoir : ON par défaut (opaque) ; clic → OFF (opacity-40, courbe masquée instantanément) ; nouveau clic → ON.
- Aucun rechargement, aucun impact sur les vues normales, le tooltip, le PDF ou les calculs.

## Faisabilité (confirmée par lecture du code)
- `SubChart` (ligne 715) construit `lines = [...currentLines, ...referenceLines, ...otherLines]` : les 3 groupes sont déjà séparés.
- Chaque `LineDef` a déjà un champ `hidden` respecté au rendu (stroke transparent, dot désactivé, label masqué) — le filtrage dynamique est donc trivial.
- Le composant zoomé est une instance dédiée de `SubChart` (`zoomed` prop), donc l'état peut être local au composant zoomé sans toucher les 4 cadres normaux.

## Modifications (uniquement `src/routes/comparer.tsx`)
1. Dans `SubChart` : ajouter un état local `curveToggles: { current: boolean; reference: boolean; target: boolean }`, initialisé tout ON, utilisé seulement quand `zoomed === true`.
2. Appliquer le filtre : `lines` reçoit `hidden: true` supplémentaire quand son groupe est OFF (les lignes déjà `hidden` restent masquées). Identifiant du groupe déduit de la source de la ligne (courant / référence / other).
3. Rendre le mini-panneau en `absolute bottom-2 left-2` à l'intérieur du `Frame`, uniquement en Mode Zoom :
   - fond blanc, bordure discrète, coins arrondis, petite taille de texte ;
   - 3 boutons texte colorés (noir `#000000`, orange `#f97316` — ou bleu `#2563EB` en CSV —, vert de la cible), chacun `opacity-100` ON / `opacity-40` OFF ;
   - libellés reprenant les noms réellement affichés sur le graphique (y compris le suffixe « N+B » / « B+W » en vue groupée), bilingues FR/EN ;
   - `aria-pressed` pour l'accessibilité.
4. Cohérence : le libellé de fin de courbe suit automatiquement puisque `hidden` masque déjà le `makeEndLabel`.

## Validation
- `bunx tsgo --noEmit` + build automatique.
- Playwright : ouvrir le Zoom sur un graphique, vérifier le panneau en bas à gauche, cliquer chaque libellé (courbe masquée + texte à 40 % d'opacité), recliquer (courbe réaffichée), vérifier que les 4 cadres normaux sont inchangés.
- Point de restauration `.lovable/backup/` avant modification, conformément aux conventions.
