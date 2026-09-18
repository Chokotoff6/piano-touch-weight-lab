# Extensions du mode Zoom et harmonisation des boutons N/B

## Résultat attendu
- Le guide de navigation Zoom est masqué au départ et s’ouvre via un bouton « i ».
- Le guide conserve exactement ses deux capsules actuelles, puis se ferme au second clic ou dès un clic ailleurs.
- Les boutons de cycle N/B doublent leur taille uniquement dans le Zoom.
- Leur bordure devient le même vert que le bouton « Résultats et graphiques », en Zoom comme en affichage normal.

## Modifications
- Adapter uniquement `src/routes/comparer.tsx` ; l’écran Mesures réel est intégré à `src/routes/saisie.tsx`, qui sert seulement de référence pour la couleur verte existante (`green-600`).
- Ajouter un état local d’ouverture du guide dans chaque graphique zoomé et une fermeture globale au clic.
- Appliquer des classes conditionnelles de taille au bouton de cycle, sans modifier son fonctionnement.
- Conserver les calculs, filtres, courbes, navigation clavier/souris et données inchangés.

## Validation
- Vérifier les types TypeScript et le build automatique.
- Contrôler visuellement le Zoom : guide fermé/ouvert/fermé, taille du cycle et bordure verte dans les deux modes.
