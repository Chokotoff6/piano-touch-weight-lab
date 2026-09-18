# Réorganiser les contrôles des graphiques

## Analyse
- Les quatre graphiques de Comparer et de Résultats partagent déjà le même composant `ComparisonChart` défini dans `src/routes/comparer.tsx`. Une seule correction structurée s’appliquera donc aux deux pages.
- Chaque `Frame` est déjà en `position: relative`, tandis que ses contrôles sont en `position: absolute`. Il n’est pas nécessaire de reconstruire l’arbre Flexbox/Grid : il suffit de séparer les trois zones d’ancrage dans le cadre.
- La difficulté principale est de réserver assez d’espace au bouton centré en bas sans recouvrir la courbe ni perturber les captures PDF. Elle sera traitée par un ancrage interne stable et un espace inférieur dédié.

## Modifications
- Séparer le bloc actuel en trois ancrages internes :
  - fermeture Zoom en haut à droite ;
  - bouton d’information centré en haut, uniquement en Zoom ;
  - bouton de cycle centré en bas de chaque cadre, en affichage normal comme en Zoom.
- Conserver les deux capsules d’aide sous le bouton d’information et leur cinématique actuelle au clic.
- Fermer immédiatement l’aide dès tout événement de molette sur le cadre Zoom, tout en conservant le déplacement horizontal existant.
- Réduire de 10 % les dimensions visuelles du bouton de cycle Zoom actuel : texte, icône, espacements et marges internes ; le bouton normal garde sa taille actuelle.
- Porter la bordure verte de tous les boutons de cycle de 1 px à exactement 1,3 px avec une valeur Tailwind arbitraire, sans modifier la couleur `green-600` de la page Mesures.
- Préserver les calculs, les filtres N/B, les interactions clavier/souris, les courbes et les données.

## Validation
- Contrôler les quatre cadres sur Comparer et Résultats en affichage normal.
- Contrôler en Zoom : centrage haut/bas, taille réduite de 10 %, ouverture de l’aide et fermeture au clic comme à la molette.
- Vérifier l’absence de chevauchement avec les courbes et valider les types TypeScript ainsi que le build.
