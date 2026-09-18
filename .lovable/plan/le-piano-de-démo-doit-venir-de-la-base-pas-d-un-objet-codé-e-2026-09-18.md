# Le piano de démo doit venir de la base, pas d'un objet codé en dur

## Diagnostic (vérifié dans le code)

Oui : aucun SELECT n'est fait sur la ligne `…0001`. Le mode démo écrit un objet local écrit en dur dans `src/lib/demo-mode.ts` (`DEMO_INFO`, lignes 37-49) : YAMAHA / U3 / numéro de série « 652444 » / année 2020 / Brussels. `enableDemoMode()` recopie cet objet dans le brouillon local (`ptw_draft_info`) et dans le « piano courant », puis génère les 88 pesées par formule (`buildDemoRows()`).

La page Saisie (`src/routes/saisie.tsx`) se contente de relire ce brouillon local. D'où l'écart avec votre fiche en base : le numéro « DEMO-ACTUEL-U3 » et l'année 2021 ne sont jamais lus, et les champs que `DEMO_INFO` ne couvre pas restent vides.

La seule lecture en base existante est `loadCurrentPianoFromCloud()` (`src/lib/current-piano.ts`), et elle est câblée exclusivement sur l'identifiant tampon réel `…0000`.

## Ce que je propose

1. **Lire réellement la fiche de démo.** Nouvelle fonction dans `current-piano.ts` : chargement du profil par identifiant, appelée avec `00000000-0000-0000-0000-000000000001`.
2. **Alimenter le mode démo depuis cette fiche.** À l'activation du mode démo, l'application récupère la ligne `…0001` et remplit le formulaire Info Piano avec ses vraies valeurs : marque, modèle, type, numéro de série complet (« DEMO-ACTUEL-U3 »), année (2021), pays, ville, climat, entretien, niveau d'usage, remarques, date de mesure.
3. **Les 88 pesées.** Si la fiche contient des mesures (`wa_values` / `wd_values`), elles sont utilisées telles quelles ; sinon on conserve la génération actuelle.
4. **Filet de sécurité.** Si la base est injoignable (hors ligne), on retombe sur l'objet local actuel, qui reste donc en dernier recours seulement.
5. **Étanchéité inchangée.** La ligne `…0001` reste exclue de la moyenne Cloud (exclusion des lignes tampon déjà en place), et le cloisonnement démo/réel n'est pas modifié.

## Détails techniques

- `src/lib/current-piano.ts` : extraire un `loadPianoProfileById(id)` (le mapping de `loadCurrentPianoFromCloud` est réutilisé tel quel) et exporter `DEMO_PIANO_BUFFER_UUID = "00000000-0000-0000-0000-000000000001"`.
- `src/lib/demo-mode.ts` : `enableDemoMode()` devient asynchrone (`enableDemoModeAsync`) — écriture immédiate de l'objet de secours pour éviter tout écran vide, puis remplacement par la fiche `…0001` dès sa réception, avec réécriture de `ptw_draft_info`, `ptw_draft_rows` et du piano courant, puis émission d'un évènement pour rafraîchir Saisie.
- `src/routes/saisie.tsx` : relecture du brouillon local sur cet évènement (pas de changement de logique de saisie).
- `src/routes/__root.tsx` : l'interrupteur mauve appelle la version asynchrone.
- `cloud-gate.ts`, les chemins d'écriture Supabase et la structure de base restent intacts.
- Point de restauration avant modification, puis `tsgo --noEmit` + build.
