# Diagnostic : pourquoi l'écriture cloud ne part plus

## Ce que j'ai vérifié

- La base externe des pianos répond normalement : lecture OK (200), et une écriture de test à vide a été acceptée (204). Les droits d'écriture ne sont donc pas en cause.
- La ligne « piano en cours » de la base porte encore la date du 15 septembre : les écritures fonctionnaient bien jusque-là.
- Aucune erreur dans les journaux récents (aucune erreur d'exécution, aucune requête réseau en échec, construction OK).

## Cause identifiée

Le bouton **« Résultats & Graphiques > »** de la page Saisie ne déclenche **aucun** envoi vers la base : il se contente de changer de page. C'est le seul rôle qu'il a dans le code actuel.

L'envoi vers la base n'existe qu'à deux endroits :

1. Le bouton **Comparer**, qui enregistre puis navigue (ligne « piano en cours » + fiche d'historique).
2. La case de consentement affichée sur la page **Résultats**, qui déclenche l'envoi au moment où l'on lève le voile des graphiques.

Or cette case n'est affichée que si le déverrouillage n'a pas déjà eu lieu, et la fonction d'envoi commence par `si (occupé ou déjà déverrouillé) → ne rien faire`. Le déverrouillage est mémorisé durablement dans le navigateur. Résultat : **dès la première fois où les graphiques ont été déverrouillés, la page Résultats n'envoie plus jamais rien** — ni création, ni mise à jour — tant que cette mémoire n'est pas effacée. La lecture, elle, continue de marcher, d'où les courbes Cloud toujours visibles.

Rien n'est cassé côté base ni côté réseau : c'est un verrou d'interface qui court-circuite l'envoi.

## Vérification immédiate possible (sans modification)

Effacer la mémoire de déverrouillage du navigateur (ou ouvrir l'app dans une fenêtre privée) fait réapparaître la case de consentement : l'envoi repart alors normalement. Cela confirme le diagnostic.

## Correction proposée (à votre feu vert uniquement)

1. Séparer le verrou d'affichage des graphiques de la décision d'envoyer : l'envoi doit s'exécuter à chaque validation, même si les graphiques sont déjà déverrouillés.
2. Faire du bouton « Résultats & Graphiques > » un vrai point d'enregistrement, comme le bouton Comparer : écriture de la ligne « piano en cours » puis création/mise à jour de la fiche d'historique, avec message d'erreur visible en cas d'échec.
3. Éviter le doublon si la page Résultats enregistre déjà lors de la même transition.

### Détails techniques

- `src/routes/resultats.tsx` : `unlock()` sort immédiatement sur `if (busy || unlocked) return;`, et le bloc de consentement n'est rendu que `si (!unlocked)`. `unlocked = topbar.compareUnlocked`, persisté dans `localStorage` (`UNLOCK_KEY`, `src/lib/topbar-store.ts`).
- `src/routes/saisie.tsx` (~ligne 2905) : le bouton Résultats appelle uniquement `navigate({ to: "/resultats" })`, sans `syncAndFinish`.
- Chemin d'écriture existant et fonctionnel : `upsertCurrentPianoBuffer` puis `findHistoryProfileId` + `saveCurrentPianoToCloud` (`src/lib/current-piano.ts`), via le client Supabase externe.
