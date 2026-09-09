# Restaurer un export réellement rapide

## Diagnostic confirmé

- Le changement vers `Promise.all` n’apporte pas de parallélisme réel : les cinq appels `html2canvas` exécutent leur clonage, calcul de styles et dessin sur le même fil d’affichage du navigateur. Ils se concurrencent au lieu de répartir le travail, donc les ~7 secondes restent.
- La baisse des graphiques à `scale: 1` réduit leur nombre de pixels, mais chaque capture clone encore une portion du document et exécute le lourd callback `onclone`.
- Chaque image est ensuite convertie en PNG avec `canvas.toDataURL("image/png")`, puis les cinq PNG sont à nouveau traités par le générateur PDF. Cette compression reste synchrone et bloque l’écran.
- Le délai de 150 ms ne réduit aucun calcul : il ajoute 150 ms. Il peut permettre un premier affichage du message, mais les captures et compressions bloquent ensuite immédiatement son rendu.
- L’ancienne impression de téléchargement instantané venait du cache préparé avant le clic : au clic, le code assemblait seulement les images déjà disponibles. Sans préparation préalable, cinq captures DOM complètes ne peuvent pas devenir réellement instantanées avec `Promise.all`.

## Correction proposée sans préparation en arrière-plan

1. Conserver intact le miroir fixe de 1250 px et toute sa mise en page.
2. Remplacer les quatre captures séparées des graphiques par deux captures de page : une pour la paire Poids descendant/remontant, une pour la paire Poids d’équilibre/Friction. Le tableau reste capturé séparément en haute définition.
3. Limiter le callback de clonage aux seules transformations nécessaires au type de bloc capturé, au lieu de parcourir et retoucher de nombreux descendants à chaque capture.
4. Éviter les PNG coûteux pour les graphiques : produire des images JPEG de qualité élevée adaptées à leur taille finale PDF. Garder le tableau en PNG pour préserver la netteté des chiffres.
5. Après chaque étape lourde, rendre brièvement la main à l’écran afin que « Export en cours... » reste visible et animé, plutôt que figé.
6. Ajouter temporairement des mesures internes par phase — tableau, pages graphiques, encodage, assemblage — pour confirmer précisément le gain, puis retirer ces mesures après validation.

## Résultat attendu

Le clic ne reposera sur aucun pré-rendu ni cache. Le travail passera de cinq clonages/compressions à trois, avec des images graphiques moins coûteuses. Une seconde exacte ne peut pas être garantie sur tous les appareils, mais cette approche attaque réellement les opérations responsables des 7 secondes tout en préservant le grand tableau.

## Position imposée du message « Export en cours... »

- Affichage fixe, exactement 10 pixels sous le bas du bouton principal « Sauver », donc juste sous la ligne du bandeau collant.
- Aligné sur le bord droit de l'écran.
- Position recalculée si le bandeau change de hauteur (chargement, redimensionnement, défilement), pour que l'écart de 10 pixels reste exact.
- Le message doit apparaître avant le début du travail lourd et rester lisible pendant toute la durée de l'export.
