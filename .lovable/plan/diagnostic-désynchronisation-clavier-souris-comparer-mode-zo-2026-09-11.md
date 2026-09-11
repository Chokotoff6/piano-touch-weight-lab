# Diagnostic : désynchronisation clavier / souris (Comparer, mode zoom)

## Ce que fait le code aujourd'hui

Trois sources de vérité coexistent dans `src/routes/comparer.tsx` :

- `lastMouseNote` : dernière note survolée physiquement (écrite dans le `onMouseMove` de Recharts).
- `lastMouseY` : hauteur verticale mémorisée, pour figer la bulle pendant le pilotage clavier.
- `kbNote` / `kbNoteRef` : note pilotée par les flèches.

Le verrou actuel : une flèche met `keyboardMode` à vrai, la souris est ignorée, et le verrou retombe seul après **400 ms** sans appui. Pendant le verrou, un survol synthétique est rejoué sur la surface Recharts à la note clavier et à la hauteur `lastMouseY`.

## Pourquoi ça se télescope

1. **`kbNoteRef` n'est jamais remis à zéro.** Le point de départ d'une flèche est `kbNoteRef.current ?? lastMouseNote.current ?? centre`. Comme `kbNoteRef` garde éternellement sa dernière valeur, la souris peut survoler la touche 60 : la flèche suivante repart quand même de l'ancienne note clavier (par ex. 32). C'est la cause principale du « ne repart plus de la dernière position de la souris ».
2. **Aucun handler ne signale « la souris a repris la main ».** Le `onMouseMove` extérieur n'enregistre que `lastMouseY`, celui de Recharts que `lastMouseNote`. Aucun des deux n'invalide l'état clavier. Il manque exactement l'étape qui existait dans la version qui fonctionnait : sur un mouvement **réel** (`isTrusted`) et verrou retombé, effacer `kbNoteRef`/`kbNote`.
3. **Le verrou temporel seul ne suffit pas.** Après 400 ms, le clavier lâche la main mais la bulle reste affichée là où le survol synthétique l'a laissée, alors que le curseur physique est ailleurs. Au premier micro-mouvement, l'affichage saute brutalement : les deux entrées se « télescopent ».
4. **Le ref est réécrit pendant le rendu.** `keyboardModeRef.current = keyboardMode` est exécuté dans le corps du composant. Le handler flèche pose le verrou immédiatement sur le ref, mais tout rendu déclenché par une autre source (molette, changement de filtre) réécrit ce ref avec la valeur d'état, ce qui peut relâcher le verrou avant l'heure.
5. **Le handler Recharts lit l'état, pas le ref.** `onMouseMove` du `LineChart` teste `keyboardMode` (état, asynchrone) alors que le verrou est posé sur `keyboardModeRef` : une fenêtre d'un rendu pendant laquelle la souris peut écraser la note clavier.

## Correctif proposé (à valider avant build)

Rendre l'index de note **unique et partagé** au lieu de deux mémoires concurrentes :

- Une seule référence `activeNote` (source unique), écrite par les deux entrées.
- Verrou clavier posé et lu **uniquement** sur un ref (jamais réécrit pendant le rendu), avec la temporisation 400 ms conservée.
- Sur mouvement souris réel et verrou retombé : la souris met à jour `activeNote` **et** efface l'état clavier, de sorte que la flèche suivante reparte exactement de la note survolée.
- Sur flèche : le clavier repart de `activeNote` (donc de la dernière position souris si c'est elle qui a agi en dernier), pose le verrou, et écrit `activeNote`.
- Le survol synthétique reste inchangé (même note, hauteur `lastMouseY`).

Aucun changement visuel, aucune autre page touchée. Point d'historique créé avant le build.

## Fichier concerné

- `src/routes/comparer.tsx` (bloc zoom : handlers souris du `SubChart`, effet clavier, effet de survol synthétique).
