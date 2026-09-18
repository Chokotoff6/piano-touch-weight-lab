# Animation de remplissage cascade du clavier (Mode Démo, page Mesures)

## Objectif
Au premier affichage de la page Mesures en Mode Démo (une seule fois par session), la grille des 88 touches démarre vide puis se remplit toute seule, de la touche 1 à la touche 88, en 15 secondes, pendant que la courbe du graphique se dessine en direct.

## Faisabilité (vérifiée dans le code)
- La page Mesures est la grille de `src/routes/saisie.tsx` (pas de fichier `mesures.tsx` séparé) ; l'état des 88 touches y est `rows` (ligne 411).
- Le graphique en direct existe déjà : `webChartData` (l. 1693) → `<ComparisonChart>` (l. 3150), recalculé par `useMemo` à chaque `setRows`. Aucune modification graphique nécessaire : chaque touche ajoutée redessine la courbe.
- Le Mode Démo charge aujourd'hui les 88 valeurs d'un coup via `enableDemoModeAsync()` (fiche démo `…0001` en base, événement `DEMO_LOADED_EVENT`).
- Modifications d'état limitées : un minuteur + un drapeau de session. Pas de refonte.

## Mise en œuvre

1. **Drapeau de session** — nouveau `sessionStorage["ptw_demo_cascade_seen"] = "1"` posé après la première animation ; toute visite suivante de la page affiche la grille complète immédiatement.

2. **Déclenchement** — dans `saisie.tsx`, à la réception de `DEMO_LOADED_EVENT` (fiche démo lue en base) : si Mode Démo actif ET drapeau absent → démarrer la cascade au lieu d'afficher les 88 valeurs d'un coup. Sinon, comportement actuel inchangé.

3. **Cascade** — `setRows(EMPTY)` puis un minuteur à intervalle strict de 170,5 ms (88 × 170,5 ms ≈ 15,0 s) qui injecte la touche `i` (valeurs `wa`/`wd` de la fiche démo) à chaque pas. À la fin : écriture du brouillon local (`ptw_draft_rows`) pour que Résultats/Comparer disposent des 88 valeurs, et pose du drapeau.
   - Nettoyage du minuteur si l'utilisateur quitte la page ou éteint le Mode Démo en cours d'animation.
   - Pendant la cascade : la saisie manuelle reste possible ; si l'utilisateur tape une valeur, l'animation s'arrête et le reste des 88 touches est rempli d'un coup (pas d'écrasement de sa saisie).

4. **Protections métier** — la cascade ne doit déclencher ni l'anti-robot, ni l'enregistrement Cloud, ni le marquage « modifié » : le remplissage passe par un chemin dédié qui n'active pas `isDirty` et ne touche pas à `cloud-gate.ts` (fichier non modifié). Le minuteur anti-robot existant n'est pas affecté (Mode Démo déjà hors périmètre d'envoi réel).

5. **Hors Mode Démo** — aucun changement : vos vrais pianos s'affichent instantanément comme aujourd'hui.

## Fichiers touchés
- `src/lib/demo-mode.ts` : export du drapeau de session + helper de cascade (ou logique minimale).
- `src/routes/saisie.tsx` : interception du chargement démo, minuteur, nettoyage.

Non touchés : `cloud-gate.ts`, écritures Supabase, Résultats, Comparer, PDF.

## Vérification
- `tsgo --noEmit` + build OK.
- Test navigateur : activer le Mode Démo, ouvrir Mesures → la grille se remplit en ~15 s et la courbe se dessine ; recharger la page → grille pleine immédiatement ; éteindre le Mode Démo → animation absente sur les vrais pianos.
