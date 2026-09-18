# Résultats vides en Mode démo : pesées inversées dans la fiche …0001

## Diagnostic confirmé
- La fiche démo `00000000-0000-0000-0000-000000000001` contient `wa_values` = 20 (×88) et `wd_values` = 58 (×88) : les deux colonnes sont inversées.
- `src/routes/resultats.tsx` (`profileFromRows`, ligne ~91) valide chaque touche avec `wa > 0 && wd > 0 && wa > wd`. Avec 20 < 58, les 88 touches sont invalides → 0 moyenne, 0 courbe.
- La page Mesures affiche les valeurs brutes sans validation, d'où l'illusion « tout est parfait ».
- Fragilité code : Résultats relit le brouillon local seulement au montage (ligne ~119) et n'écoute pas `DEMO_LOADED_EVENT` — si la fiche arrive de la base après l'ouverture de la page, les graphiques restent vides.

## Corrections

1. **Corriger les données de la fiche démo (SQL, à la demande)** — inverser les colonnes pour la seule ligne `…0001` (protégée `demo = true`, aucune autre ligne touchée) :
   ```sql
   UPDATE public.piano_profiles
   SET wa_values = wd_values, wd_values = wa_values
   WHERE id = '00000000-0000-0000-0000-000000000001';
   ```
   (En pratique : wa passe à 58, wd à 20, cohérent avec un U3 lourd de démo.)

2. **Filet de sécurité côté code (`src/lib/demo-mode.ts`)** — dans `enableDemoModeAsync`, si la série chargée est entièrement inversée (toutes les touches `wd > wa`), permuter wa/wd au moment du mapping, pour que la fiche démo reste exploitable même si les données sont de nouveau saisies à l'envers. Aucun autre profil n'est concerné : ce filet ne s'applique qu'au chargement de la fiche démo, jamais aux vraies fiches atelier.

3. **Rafraîchissement de Résultats (`src/routes/resultats.tsx`)** — écouter `DEMO_LOADED_EVENT` (comme la page Saisie) et relire `readDraft()` à l'arrivée de la fiche, pour que moyennes et courbes apparaissent même si la base répond après l'ouverture de la page.

## Non touché
- `cloud-gate.ts`, les chemins d'écriture Cloud, le filtrage démo/réel (`scopeDemo`), la validation métrologique `wa > wd` des vraies saisies.

## Validation
- Point de restauration avant modification (`.lovable/backup/`).
- `bunx tsgo --noEmit` + build OK.
- Vérification navigateur : Mode démo actif → page Résultats affiche moyennes et courbes du U3 de démo.
