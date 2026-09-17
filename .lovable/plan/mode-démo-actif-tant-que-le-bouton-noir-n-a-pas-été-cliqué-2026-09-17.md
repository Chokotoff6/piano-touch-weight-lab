# Mode démo : actif tant que le bouton noir n'a pas été cliqué

Vous avez raison sur les deux points.

## Ce qui se passe réellement

Deux mémoires différentes décident de l'état du mode démo :

- le drapeau « démo quitté » vit dans la mémoire **de session** (effacé à chaque nouvel onglet) ;
- l'interrupteur « démo actif / inactif » vit dans la mémoire **permanente** du navigateur.

Résultat : si le bouton noir a été cliqué un jour, l'interrupteur permanent reste sur « inactif » pour toujours, même dans une nouvelle session où le bouton noir est de nouveau visible et n'a jamais été cliqué. C'est exactement votre cas sur la page Comparer : le bouton est là, vous n'avez rien cliqué, et pourtant l'appli se comporte comme hors démo.

Quant à « (hors fiches démo) » et « Réactiver le mode démo » : ce ne sont pas des données inventées, ce sont deux éléments d'interface que j'ai ajoutés au tour précédent pour contourner ce problème. Ils n'ont plus lieu d'être.

## Correction proposée

1. **Une seule règle, de session** : le mode démo est considéré actif dès l'ouverture de l'application et le reste tant que le bouton noir n'a pas été cliqué dans cette session. Un clic le désactive et le bouton disparaît jusqu'à la fermeture de l'onglet.
2. **Suppression du lien « Réactiver le mode démo »** de la page Comparer : inutile puisque le mode démo est actif par défaut à chaque nouvelle session.
3. **Suppression de la mention « (hors fiches démo) / (fiches démo incluses) »** dans le panneau latéral, sauf si vous préférez la garder comme simple repère.

## Détails techniques

- `src/lib/demo-scope.ts` : `demoScopeActive()` ne dépend plus que du drapeau de session `demo_mode_destroyed` ; absence du drapeau = démo actif.
- `src/lib/demo-mode.ts` : `isDemoActive()` aligné sur la même règle ; `ensureDemoDefault()` réinjecte le jeu démo à chaque nouvelle session tant que le bouton n'a pas été cliqué, même si l'interrupteur permanent était resté sur « inactif » ; `rearmDemoMode()` retiré (devenu inutile).
- `src/routes/comparer.tsx` : retrait de l'état `demoScope`, du bouton de réactivation et de la mention de périmètre ; `SidebarPanel` nettoyé des props correspondantes.
- Vérification : compilation des types puis build.

## Point non résolu par ce correctif

Le doublon en base (fiche SN 652444, mesures strictement identiques à votre piano) reste la raison pour laquelle la moyenne Cloud colle au piano actuel hors démo. Le filtre anti-clone déjà en place l'écarte côté application ; la suppression définitive de cette fiche en base reste à votre décision.
