# Refonte du déclenchement des enregistrements Cloud (3 boutons)

## Constat de départ (vérifié)

- La base répond : lecture OK, écriture autorisée (test à vide accepté), dernière ligne « piano en cours » datée du 15 septembre.
- Le bouton « Résultats & Graphiques > » ne fait qu'un changement de page : aucun envoi.
- Sur la page Résultats, l'envoi est court-circuité par `si (occupé ou déjà déverrouillé) → ne rien faire`, et le bloc de consentement n'apparaît que si le déverrouillage n'a jamais eu lieu. Le déverrouillage étant mémorisé durablement, plus rien n'est écrit après la première fois.

## Point de restauration

Sauvegarde complète des fichiers touchés dans `.lovable/backup/<horodatage>/` avant toute modification.

## 1. Interception de la navigation

Un aiguilleur unique et partagé remplace les navigations directes des trois déclencheurs : onglet « Résultats » (barre du haut), bouton « Résultats & Graphiques > » (Saisie), et boutons « Comparer » / « Exporter » tant que l'accord n'a pas été donné. Aucun de ces boutons ne navigue sans avoir déroulé l'algorithme.

## 2. Étape 1 — Filtre anti-robot

Champ leurre rempli, ou saisie manuelle plus rapide que le seuil humain : envoi bloqué, accord local remis à « non accepté », interface reverrouillée. Sinon on passe à l'étape 2.

## 3. Étape 2 — Consentement et écriture

**Branche nouveau piano** (jamais accepté en mémoire locale)
- Données issues d'un import CSV : le verrou de chronométrage initial est contourné.
- Saisie manuelle : temps écoulé depuis l'ouverture de la fiche comparé au seuil humain ; en dessous, blocage pour fraude.
- Graphiques, Comparer et Exporter restent inactifs. Un bouton « J'accepte » est affiché sous le message bilingue exact demandé (texte FR puis EN, mise en forme soignée).
- L'écriture (profil complet, numéro de série entier et en clair) part uniquement au clic sur « J'accepte » ; les modules se débloquent et l'accord est mémorisé.

**Branche mise à jour** (piano déjà accepté)
- Accès direct aux graphiques, pas de message.
- Zéro touche modifiée → aucun envoi (sauf ré-import CSV qui écrase tout).
- Ratio temps écoulé / nombre de touches modifiées trop court → envoi bloqué, accord remis à « non accepté », interface reverrouillée (règle contournée en cas de ré-import CSV).
- Ratio cohérent → mise à jour silencieuse en arrière-plan.

## 4. Protection de l'identité de l'instrument

- Une fois le profil accepté (ou piano déjà déverrouillé), les cinq champs Marque, Modèle, Numéro de série, Type de piano et Année passent en lecture seule et grisés. Les tableaux de poids restent modifiables en boucle.
- Message d'aide bilingue exact centré juste sous ces champs (« Champs verrouillés… / Fields locked… »).
- Le bouton « Reset » remet l'accord local à « non accepté » et repart d'une fiche vierge.

## Détails techniques

- Nouveau module `src/lib/cloud-gate.ts` : seuils humains, mesure du temps d'ouverture de fiche, comptage des touches modifiées, décision (`blocked` / `needsConsent` / `silentUpsert` / `skip`), réinitialisation de l'accord.
- `src/lib/anti-bot.ts` : réutilisation de `passesBotChecks` / `markSubmission` ; ajout du contrôle de ratio temps-par-touche et de l'indicateur « origine import CSV ».
- `src/lib/topbar-store.ts` : `compareUnlocked` devient l'état d'accord manipulé aussi en sens inverse (`setCompareUnlocked(false)` sur fraude et sur Reset) ; ajout d'un indicateur d'identité verrouillée.
- `src/routes/saisie.tsx` : le bouton « Résultats & Graphiques > » et `startAction` passent par l'aiguilleur ; réutilisation de `syncAndFinish` (aucune duplication de la logique d'écriture) ; champs d'identité désactivés + message d'aide ; `Reset` réinitialise l'accord.
- `src/routes/resultats.tsx` : `unlock()` ne sort plus sur `unlocked` ; il exécute la branche décidée par l'aiguilleur (consentement ou mise à jour silencieuse) ; bouton « J'accepte » sous le message bilingue.
- `src/routes/__root.tsx` : l'onglet Résultats appelle l'aiguilleur au lieu de naviguer directement.
- Chemin d'écriture inchangé : `upsertCurrentPianoBuffer` puis `findHistoryProfileId` + `saveCurrentPianoToCloud`, plus `insertDiagnostic` / `updateDiagnostic`.
- Vérification du build après chaque étape.
