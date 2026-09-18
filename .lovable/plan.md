# Mini-panneau ON/OFF des courbes en Mode Zoom (Comparer)

## Résultat attendu
- En Mode Zoom uniquement, un mini-panneau apparaît en bas à gauche à l'intérieur du cadre du graphique, à côté du bouton de cycle centré.
- Il liste les 3 courbes avec leur libellé réel, coloré comme leur ligne :
  - « Piano actuel » / « Piano actuel N+B » (FR) ou équivalents EN → texte noir
  - « Cloud » / « Cloud N+B » (ou « Import CSV ») → texte orange (bleu si import CSV)
  - Cible (libellé actuel `targetLabel`) → texte vert
- Chaque libellé est un bouton poussoir : clic → OFF (texte `opacity-40`, courbe masquée instantanément) ; nouveau clic → ON.
- Aucun rechargement, aucun impact sur les vues normales, le tooltip, le PDF ou les calculs.

## Héritage de l'état du panneau latéral (exigence clé)
À l'ouverture du Zoom, le mini-panneau ne force pas tout sur ON : il démarre exactement sur l'état choisi dans le grand panneau de réglages latéral.
- État existant confirmé dans `src/routes/comparer.tsx` :
  - Courbe de référence (Cloud / Import CSV) visible ⇔ `sourceMode === "cloud"` ou `comparedPiano !== null` (bouton Cloud / import CSV du panneau latéral) ;
  - Courbe cible visible ⇔ `standardEnabled` (bouton « Cible » du panneau latéral) ;
  - Piano actuel : toujours affiché (pas d'interrupteur latéral) → démarre ON.
- Liaison : ces booléens (`standardEnabled`, cloud/CSV actif) sont déjà disponibles au niveau de la page et transmis à `ComparisonChart` ; ils seront ajoutés au `SubChartCtx` (ou déduits des props existantes : `targetLabel` + présence de données de comparaison) pour initialiser les interrupteurs du mini-panneau à chaque ouverture du Zoom.
- Les interrupteurs du mini-panneau ne modifient que l'affichage pendant la session de zoom (état local au `SubChart` zoomé) : le panneau latéral et les cadres normaux ne sont pas altérés. À la fermeture puis réouverture du Zoom, l'état est relu depuis le panneau latéral.

## Faisabilité (confirmée par lecture du code)
- `SubChart` (ligne 715) construit `lines = [...currentLines, ...referenceLines, ...otherLines]` : les 3 groupes sont déjà séparés.
- Chaque `LineDef` a déjà un champ `hidden` respecté au rendu (stroke transparent, dot désactivé, label de fin masqué) — le filtrage dynamique est trivial.
- Le composant zoomé est une instance dédiée de `SubChart` (`zoomed` prop) : état local possible sans toucher les 4 cadres normaux.

## Modifications (uniquement `src/routes/comparer.tsx`)
1. Ajouter dans `SubChart` un état local `curveToggles: { current: boolean; reference: boolean; target: boolean }`, initialisé quand `zoomed` passe à `true` depuis l'état hérité du panneau latéral (référence : cloud/CSV actif ; cible : `standardEnabled` ; piano actuel : ON).
2. Appliquer le filtre : les lignes d'un groupe OFF reçoivent `hidden: true` (en plus du `hidden` existant) — courbe, points et étiquette de fin disparaissent instantanément.
3. Rendre le mini-panneau en `absolute bottom-2 left-2` à l'intérieur du `Frame`, uniquement en Mode Zoom :
   - fond blanc, bordure discrète, coins arrondis, petit texte ;
   - 3 boutons texte colorés (noir `#000000`, orange `#f97316` — ou bleu `#2563EB` en CSV —, vert de la cible), `opacity-100` ON / `opacity-40` OFF ;
   - libellés = noms réellement affichés sur le graphique (suffixe « N+B » / « B+W » en vue groupée), bilingues FR/EN ;
   - `aria-pressed` pour l'accessibilité.

## Validation
- Point de restauration `.lovable/backup/` avant modification (convention du projet).
- `bunx tsgo --noEmit` + build automatique.
- Playwright : masquer le Cloud dans le panneau latéral, ouvrir le Zoom → texte orange semi-transparent et courbe absente ; cliquer chaque libellé (courbe masquée/réaffichée à la volée) ; vérifier que les 4 cadres normaux et le panneau latéral sont inchangés après fermeture du Zoom.
